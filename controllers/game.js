const sequelize = require("../models/sequelize_instance");
const util = require('../misc/tools');
const Game = require("../models/game")(sequelize);
const Game_Achievement = require("../models/game_achievement")(sequelize);
const Player_Achievement = require('../models/player_achievement')(sequelize);
const Achievement = require("../models/achievement")(sequelize);
const Player = require("../models/player")(sequelize);
const Event = require("../models/event")(sequelize);
var gameList = Array();
// Game Start and Information Retrieval

const getAllGamesAndPlayers = async (req, res) => {
  try {
    if (!Player.hasAlias('achievements')) {
      Player.hasMany(Player_Achievement, { foreignKey: 'playerId', as: 'achievements' })
    }
    if (!Player_Achievement.hasAlias('achievements')) {
      Player_Achievement.belongsTo(Player, { foreignKey: 'playerId', as: 'achievements' })
    }
    if (!Achievement.hasAlias('achievement')) {
      Achievement.hasMany(Player_Achievement, { foreignKey: 'achievementId', as: 'achievement' });
    }
    if (!Player_Achievement.hasAlias('achievement')) {
      Player_Achievement.belongsTo(Achievement, { foreignKey: 'achievementId', as: 'achievement' });
    }
    if (!Player.hasAlias('players')) {
      Player.belongsTo(Game, { foreignKey: "game_id", as: 'players' });
    }
    if (!Game.hasAlias('players')) {
      Game.hasMany(Player, { foreignKey: "game_id", as: 'players' });
    }
    await Game.findAll({
      where: {
        eventCode: req.params.eventCode,
      },
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "rounds",
          "timeStarted",
          "event_id",
        ],
      },
      include: {
        model: Player, as: 'players',
        include: {
          model: Player_Achievement, as: 'achievements', attributes: ['completed'],
          include: {
            model: Achievement, as: 'achievement', attributes: ['name', 'desc', 'points']
          }
        }
      },
    }).then((games) => {
      res.status(200).json(games);
    });
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
};

const getGame = async (req, res) => {
  try {
    const game = Game.findOne({
      where: {
        id: req.params.id
      }
    }).then((game) => {
      res.status(200).json(game);
    })

  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}
const getAllGames = async (req, res) => {
  try {
    await Game.findAll({
      where: {
        eventCode: req.params.eventCode
      }
    }).then((games) => {
      res.status(200).json(games);
    })
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}

const getGameAndAchievements = (req, res) => {
  try {
    if (!Game.hasAlias('achievements')) {
      Game.hasMany(Game_Achievement, { foreignKey: 'game_id', as: 'achievements' });
    }
    if (!Game_Achievement.hasAlias('achievements')) {
      Game_Achievement.belongsTo(Game, { foreignKey: 'game_id', as: 'achievements' });
    }
    if (!Achievement.hasAlias('achievement')) {
      Achievement.hasMany(Game_Achievement, { foreignKey: 'achievement_id', as: 'achievement' });
    }

    if (!Game_Achievement.hasAlias('achievement')) {
      Game_Achievement.belongsTo(Achievement, { foreignKey: 'achievement_id', as: 'achievement' });
    }
    Game.findOne({
      where: {
        id: req.params.id
      },
      attributes: {
        exclude: [
          "id",
          "createdAt",
          "updatedAt",
          "game_id",
          "achievement_id"
        ],
      },
      include: [{
        model: Game_Achievement, as: 'achievements',
        attributes: [
          'completed',
          'player_id'
        ],
        include: [{
          model: Achievement, as: 'achievement',
          attributes: [
            'name',
            'desc',
            'points'
          ]
        }]
      }]
    }).then((game) => {
      res.status(200).json(game);
    })
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}

const startGame = async (req, res) => {
  try {
    await Game.update(
      {
        timeStarted: new Date(),
      },
      {
        where: {
          gameCode: req.params.gameCode,
        },
      }
    ).then((game) => {
      res.status(200).json({ message: "Game started" });
    });
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
};

//Game Update
const completeGameAchievement = (req, res) => {
  try {
    const player = Player.findOne({
      where: {
        id: req.params.player_id
      }
    });
    const achievement = Game_Achievement.findOne({
      where: {
        id: req.body.id,
        game_id: req.body.game_id
      }
    });
    if (player != null && achievement != null) {
      achievement.update({
        completed: true,
        player_id: player.id
      }, {
        where: achievement.id
      }).then((result) => {
        res.status(200).json({ message: `Achievement completed by ${player.nickname}` })
      })
    }
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}

// Game Creation
const createGameWithAchievements = async (req, res) => {
  try {
    var achievements = [];
    for (var i = 0; i < 3; i++) {
      await Achievement.findOne({
        order: sequelize.random()
      }).then((result) => {
        achievements.push(result);
      })
    }
    var game = await createGame(req, res);
    achievements.forEach(async (achievement) => {
      var gameAchievement = await Game_Achievement.build({
        achievement_id: achievement.id,
        game_id: game.id,
        completed: false
      });
      await gameAchievement.save()
    });
    if (!Game.hasAlias('achievements')) {
      Game.hasMany(Game_Achievement, { foreignKey: 'game_id', as: 'achievements' });
    }
    if (!Game_Achievement.hasAlias('achievements')) {
      Game_Achievement.belongsTo(Game, { foreignKey: 'game_id', as: 'achievements' });
    }

    if (!Achievement.hasAlias('achievement')) {
      Achievement.hasMany(Game_Achievement, { foreignKey: 'achievement_id', as: 'achievement' });
    }

    if (!Game_Achievement.hasAlias('achievement')) {
      Game_Achievement.belongsTo(Achievement, { foreignKey: 'achievement_id', as: 'achievement' });
    }

    await Game.findOne({
      where: {
        gameCode: game.gameCode
      },
      include: [{
        model: Game_Achievement, as: 'achievements',
        include: [{
          model: Achievement, as: 'achievement',
          attributes: [
            'name',
            'desc',
            'points'
          ]
        }]
      }]
    }).then((game) => {
      res.status(200).json(game);
    })
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}

const createGame = async (req, res) => {
  try {
    const game = await Game.create({
      date_played: new Date(),
      event_id: req.body.event_id,
      gameCode: util.makeId(5),
      lookingForPlayers: true,
      playerCount: 1,
      rounds: 1,
    }).then(async (created) => {
      try {
        await Player.update(
          { game_id: created.id },
          { where: { id: req.body.player_id } }
        );
      } catch (error) {
        console.log(`Error updating: ${error}`)
      }

      res.status(200).json(created)
    });
    return game;
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
}


const groupPlayersIntoGame = async (req, res) => {
  try {
    if (!Game.hasAlias('players')) {
      Game.hasMany(Player, { foreignKey: 'game_id', as: 'players' })
    }
    if (!Player.hasAlias('players')) {
      Player.belongsTo(Game, { foreignKey: 'game_id', as: 'players' })
    }
    if (!Player.hasAlias('achievements')) {
      Player.hasMany(Player_Achievement, { foreignKey: 'playerId', as: 'achievements' });
    }
    if (!Player_Achievement.hasAlias('achievements')) {
      Player_Achievement.belongsTo(Player, { foreignKey: 'playerId', as: 'achievements' })
    }

    var playerArray = [];
    var achievements = [];
    const event = await Event.findOne({
      where: {
        id: req.body.event_id
      }
    })
    // 1. create game
    const game = await Game.build({
      timeEnded: null,
      timeStarted: new Date(),
      eventCode: event.eventCode,
      date_played: new Date(),
      event_id: event.id,
      gameCode: util.makeId(5),
      rounds: 1,
      first: null,
      second: null,
      third: null,
      fourth: null,
      playerCount: 0,
      lookingForPlayers: true
    });
    await game.save();


    // 2. get 3 random achievements
    var achievements = [];
    for (var i = 0; i < 3; i++) {
      await Achievement.findOne({
        order: sequelize.random()
      }).then((result) => {
        achievements.push(result.id);
      })
    }

    // 3. Get all players looking for game that are approved
    await Player.findAll({
      order: sequelize.random(),
      limit: 4,
      where: {
        isLookingForGame: true,
        isEventApproved: true
      }
    }).then((result) => {
      if (!result) {
        res.send("No players looking for a game");
      }
      if (result.length < 4) {
        res.send("Need at least one more player to start a game")
      }
      result.forEach((item) => {
        playerArray.push(item.id)
      })
    })

    await Player.update(
      {
        game_id: game.id,
        isLookingForGame: false
      },
      {
        where:
        {
          id: playerArray
        }
      }
    );
    achievements.forEach((item) => {
      playerArray.forEach(async (id) => {
        const playerAchievement = await Player_Achievement.build({
          playerId: id,
          achievementId: item,
          completed: false
        })
        await playerAchievement.save();
      });
    })
    await Game.update({
      playerCount: 4,
    }, {
      where: {
        id: game.id
      }
    });
    await Game.findOne({
      where: {
        id: game.id
      },
      include: { model: Player, as: "players" }
    }).then((game) => {
      res.status(200).json(game);
    })
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }

}

// Game Conclusion

const endGame = (req, res) => {
  try {
    Game.update(
      {
        time_ended: new Date(),
      },
      {
        where: {
          gameCode: req.params.gameCode,
        },
      }
    ).then((game) => {
      res.status(200).json({ message: "Game started" });
    });
  } catch (error) {
    console.error(error.stack);
    res.status(500).send({ error: `Something failed! ${error.message}` });
  }
};

const declareWinners = async (req, res) => {
  Game.update(
    {
      first: req.body.first,
      second: req.body.second,
      third: req.body.third,
      fourth: req.body.fourth,
    },
    {
      where: { gameCode: req.params.gameCode },
    }
  );
};

module.exports = {
  getAllGamesAndPlayers,
  getGame,
  getAllGames,
  getGameAndAchievements,
  createGame,
  startGame,
  endGame,
  declareWinners,
  createGameWithAchievements,
  groupPlayersIntoGame,
  completeGameAchievement
};
