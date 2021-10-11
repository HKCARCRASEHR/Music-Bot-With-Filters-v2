////////////////////////////
//////CONFIG LOAD///////////
////////////////////////////
const ytdl = require("discord-ytdl-core");
const { canModifyQueue } = require("../util/nkm");
const { Client, Collection, MessageEmbed, splitMessage, escapeMarkdown,MessageAttachment } = require("discord.js");
const { attentionembed } = require("../util/attentionembed"); 
const createBar = require("string-progressbar");
const lyricsFinder = require("lyrics-finder");
const {
  approveemoji,
  denyemoji,
  BOTNAME,
} = require(`../config.json`);
////////////////////////////
//////COMMAND BEGIN/////////
////////////////////////////
module.exports = {
  async play(song, message, client, filters) {
    //VERY MESSY CODE WILL BE CLEANED SOON!
    const { PRUNING, SOUNDCLOUD_CLIENT_ID } = require("../config.json");

    const queue = message.client.queue.get(message.guild.id);
    
    if (!song) {
      queue.channel.leave();
      message.client.queue.delete(message.guild.id);
      const endembed = new MessageEmbed().setColor("#FF0000")
        .setAuthor(`Music Queue ended.`, "https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false")
      return queue.textChannel.send(endembed).catch(console.error);
    }

    let stream = null;
    let streamType = song.url.includes("youtube.com") ? "opus" : "ogg/opus";
    let isnotayoutube=false;        
    let seekTime = 0;
    let oldSeekTime = queue.realseek;
    let encoderArgstoset;
    if (filters === "remove") {
        queue.filters = ['-af','dynaudnorm=f=200'];
        encoderArgstoset = queue.filters;
        try{
          seekTime = (queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000 + oldSeekTime;
        } catch{
          seekTime = 0;
        } 
          queue.realseek = seekTime;
    } else if (filters)
    {
      try{
        seekTime = (queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000 + oldSeekTime;
      } catch{
        seekTime = 0;
      } 
        queue.realseek = seekTime;
        queue.filters.push(filters)
        encoderArgstoset = ['-af', queue.filters]
    }
 

    try {
      if (song.url.includes("youtube.com")) {
         stream = ytdl(song.url, {
          filter: "audioonly",
          opusEncoded: true,
          encoderArgs: encoderArgstoset,
          bitrate: 320,
          seek: seekTime, 
          quality: "highestaudio",
          liveBuffer: 40000,
          highWaterMark: 1 << 25, 
  
      });
      } else if (song.url.includes(".mp3") || song.url.includes("baseradiode")) {
        stream = song.url;
        isnotayoutube = true;
      }
    } catch (error) {
      if (queue) {
        queue.songs.shift();
        module.exports.play(queue.songs[0], message);
      }

      console.error(error);
      return attentionembed(message, `Error: ${error.message ? error.message : error}`);
    }

    queue.connection.on("disconnect", () => message.client.queue.delete(message.guild.id));   
    
    if(isnotayoutube){
      console.log("TEST")
      const dispatcher = queue.connection
      .play(stream)
      .on("finish", () => {
        if (collector && !collector.ended) collector.stop();

        if (queue.loop) {
          let lastSong = queue.songs.shift();
          queue.songs.push(lastSong);
          module.exports.play(queue.songs[0], message);
        } else {
          queue.songs.shift();
          module.exports.play(queue.songs[0], message);
        }
    })
    .on("error", (err) => {
      console.error(err);
      queue.songs.shift();
      module.exports.play(queue.songs[0], message);
    });
  dispatcher.setVolumeLogarithmic(queue.volume / 100);
    }else{
      const dispatcher = queue.connection
      .play(stream, { type: streamType })
      .on("finish", () => {
        if (collector && !collector.ended) collector.stop();
  
        if (queue.loop) {
          let lastSong = queue.songs.shift();
          queue.songs.push(lastSong);
          module.exports.play(queue.songs[0], message);
        } else {
          queue.songs.shift();
          module.exports.play(queue.songs[0], message);
        }
      })
      .on("error", (err) => {
        console.error(err);
        queue.songs.shift();
        module.exports.play(queue.songs[0], message);
      });
    dispatcher.setVolumeLogarithmic(queue.volume / 100);
    }
    
  let thumb;
    if (song.thumbnail === undefined) thumb = "https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false";
    else thumb = song.thumbnail.url;

  try {
      let embed = new MessageEmbed()
      .setColor("#FF0000")
      .setAuthor(`Red army choir now playing: ${song.title}`,'https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false')
      var playingMessage = await queue.textChannel.send(embed);
      var playingMessage = await queue.textChannel.send(`${song.url}`);
      await playingMessage.react("⏭");
      await playingMessage.react("⏯");
      await playingMessage.react("🔉");
      await playingMessage.react("🔊");
      await playingMessage.react("🔇");
      await playingMessage.react("🔁");
      await playingMessage.react("🔀");
      await playingMessage.react("⏹");
      await playingMessage.react("🎵");
      await playingMessage.react("🎶");
      await playingMessage.react("📑");
    } catch (error) {
      console.error(error);
    }

    const filter = (reaction, user) => user.id !== message.client.user.id;
    var collector = playingMessage.createReactionCollector(filter, {
      time: song.duration > 0 ? song.duration * 1000 : 600000
    });

    collector.on("collect", async (reaction, user) => {
      if (!queue) return;
      const member = message.guild.member(user);

      switch (reaction.emoji.name) {
        case "⏭":
          queue.playing = true;
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.connection.dispatcher.end();
          queue.textChannel.send(`⏩ skipped the song`).catch(console.error);
          collector.stop();
          break;

        case "⏯":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.playing) {
            queue.playing = !queue.playing;
            queue.connection.dispatcher.pause(true);
            queue.textChannel.send(` ⏸ pause the music my comrade.`).catch(console.error);
          } else {
            queue.playing = !queue.playing;
            queue.connection.dispatcher.resume();
            queue.textChannel.send(` ▶ resume the music! Now!`).catch(console.error);
          }
          break;

        case "🔇":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.volume <= 0) {
            queue.volume = 100;
            queue.connection.dispatcher.setVolumeLogarithmic(100 / 100);
            queue.textChannel.send(` 🔊 Lets rock and roll!`).catch(console.error);
          } else {
            queue.volume = 0;
            queue.connection.dispatcher.setVolumeLogarithmic(0);
            queue.textChannel.send(`🔇 No more music!`).catch(console.error);
          }
          break;

        case "🔉":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.volume - 10 <= 0) queue.volume = 0;
          else queue.volume = queue.volume - 10;
          queue.connection.dispatcher.setVolumeLogarithmic(queue.volume / 100);
          queue.textChannel
            .send(` 🔉 The volume is now ${queue.volume}%`)
            .catch(console.error);
          break;

        case "🔊":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          if (queue.volume + 10 >= 100) queue.volume = 100;
          else queue.volume = queue.volume + 10;
          queue.connection.dispatcher.setVolumeLogarithmic(queue.volume / 100);
          queue.textChannel
            .send(`🔊 The volume is now ${queue.volume}%`)
            .catch(console.error);
          break;

        case "🔁":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.loop = !queue.loop;
          queue.textChannel.send(`Brainwash mode ${queue.loop ? "**on**" : "**off**"}`).catch(console.error);
          break;

        case "⏹":
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          queue.songs = [];
          queue.textChannel.send(` ⏹ stop the music! cyka blyat!`).catch(console.error);
          try {
            queue.connection.dispatcher.end();
          } catch (error) {
            console.error(error);
            queue.connection.disconnect();
          }
          collector.stop();
          break;

        default:
          reaction.users.remove(user).catch(console.error);
          break;

          case "🔀":
        reaction.users.remove(user).catch(console.error);
        if (!queue)
            return message.channel
                  .send("There is no queue.")
                  .catch(console.error);
          if (!canModifyQueue(member)) return;
          let songs = queue.songs;
          queue.songs = songs;
          for (let i = songs.length - 1; i > 1; i--) {
              let j = 1 + Math.floor(Math.random() * i);
              [songs[i], songs[j]] = [songs[j], songs[i]];
          }
          message.client.queue.set(message.guild.id, queue);
          queue.textChannel
            .send(`🔀 Shuffled The Queue my comrade.`)
            .catch(console.error);
          break;

         case "🎵":
        reaction.users.remove(user).catch(console.error);
        const song = queue.songs[0];
        //get current song duration in s
        let minutes = song.duration.split(":")[0];   
        let seconds = song.duration.split(":")[1];    
        let ms = (Number(minutes)*60+Number(seconds));   
        //get thumbnail
        let thumb;
        if (song.thumbnail === undefined) thumb = "https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false";
        else thumb = song.thumbnail.url;
        //define current time
        const seek = (queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000;
        //define left duration
        const left = ms - seek;
        //define embed
        let nowPlaying = new MessageEmbed()
          .setAuthor('♪Red army choir now playing♪','https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false')
          .setDescription(`[**${song.title}**](${song.url})`)
          .setThumbnail(song.thumbnail.url)
          .setColor("#FF0000")
          .setFooter(`Requested by: ${message.author.username}#${message.author.discriminator}`, message.member.user.displayAvatarURL({ dynamic: true }))
      //if its a stream
      if(ms >= 10000) {
        nowPlaying.addField("\u200b", "🔴 LIVE", false);
        //send approve msg
        return message.channel.send(nowPlaying);
      }
      //If its not a stream 
      if (ms > 0 && ms<10000) {
        nowPlaying.addField("\u200b", "**``[" + createBar((ms == 0 ? seek : ms), seek, 25, "▬", "🔘")[0] + "]``**\n**" + "\n[" + new Date(seek * 1000).toISOString().substr(11, 8) + " / " + (ms == 0 ? " ◉ LIVE" : new Date(ms * 1000).toISOString().substr(11, 8))+ "]**" + "\n" + "\n **Time Remaining:**" + "``" + new Date(left * 1000).toISOString().substr(11, 8) + "``", false );
            //send approve msg
            return message.channel.send(nowPlaying);
          }
          break;

          case "🎶":
          reaction.users.remove(user).catch(console.error);
          const description = queue.songs.map((song, index) => `${index + 1}. ${escapeMarkdown(song.title)}`);

          let queueEmbed = new MessageEmbed()
            .setTitle("Music Queue")
            .setDescription(description)
            .setColor("#FF0000")
             ;
      
          const splitDescription = splitMessage(description, {
            maxLength: 2048,
            char: "\n",
            prepend: "",
            append: ""
          });
      
          splitDescription.forEach(async (m) => {
      
            queueEmbed.setDescription(m);
            message.react(approveemoji)
            message.channel.send(queueEmbed);
          });
          break;

          case "📑":
        
          reaction.users.remove(user).catch(console.error);
          if (!canModifyQueue(member)) return;
          let lyrics = null;
          let temEmbed = new MessageEmbed()
          .setAuthor("Searching...", "https://steamuserimages-a.akamaihd.net/ugc/930426796060400522/05E28E07F136266CD687DFC1A52CC3D5914797DD/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false").setFooter("Lyrics")
          .setColor("#FF0000")
          let result = await message.channel.send(temEmbed)
          try {
            lyrics = await lyricsFinder(queue.songs[0].title,"");
            if (!lyrics) lyrics = `No lyrics found for ${queue.songs[0].title}.`;
          } catch (error) {
            lyrics = `No lyrics found for ${queue.songs[0].title}.`;
          }
      
          let lyricsEmbed = new MessageEmbed()
            .setTitle("🗒️ Lyrics")
            .setDescription(lyrics)
            .setColor("#FF0000")
      
          if (lyricsEmbed.description.length >= 2048)
      
            lyricsEmbed.description = `${lyricsEmbed.description.substr(0, 2045)}...`;
            message.react(approveemoji);
          return result.edit(lyricsEmbed).catch(console.error);

          break;
      }
    });

    collector.on("end", () => {
      playingMessage.reactions.removeAll().catch(console.error);
      if (PRUNING && playingMessage && !playingMessage.deleted) {
        playingMessage.delete({ timeout: 3000 }).catch(console.error);
      }
    });
  }
};
