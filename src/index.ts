import { assert, time } from 'console'
import { Context, Schema, Time } from 'koishi'

export const inject = {
  require: ['database']
}

export const name = 'texas'

export const usage = `
## 🎮 使用说明

- 建议在指令管理中为指令设置合适的调用时间间隔（大于0.5s），避免消息错位
- 本插件依赖于 \`database服务\`，需要先启动这个服务
- 本插件的筹码可由房主任意设定，游戏时请自行遵循相关规则
- 请不要使用本插件进行违规活动

## 📝 基本命令

### 房间相关

- \'help texas\'：显示本插件的所有指令及用法
- \'texas.join [bet]\'：在群组中输入则会加入群组中的房间，每个群组只有一个房间，bet为进入房间时携带的筹码量，不输入则取默认值
- \'texas.leave\'：在群组中输入则会退出群组中的房间
- \'texas.info\'：查询房间中的信息，包括玩家的次序，筹码等
- \'texas.setbutton <index>\'：设置庄位为编号为 index 的玩家（仅房主）
- \'texas.setbet <index> <bet>\'：设置编号为 index 的玩家的筹码为 bet（仅房主）
- \'texas.setowner <index>\'：将房主转让给编号为 index 的玩家（仅房主）
- \'texas.start\'：开始游戏（仅房主，房间内玩家需不少于3人）
- \'texas.history\'：查看本群组中的历史对局

### 游戏相关

- \'texas.info\'：游戏开始时，可以查询游戏中的信息，包括玩家下注、桌面牌等
- \'texas.hands\'：与机器人私聊可获得自己的手牌
- \'texas.all\'：将自己的筹码全部投入池中
- \'texas.call\'：跟注，将自己的下注提升至与上一次加注相同
- \'texas.raise <bet>\'：加注，将自己的下注提升 bet 的数值
- \'texas.raiseto <bet>\'：加注至，将自己的下注提升至 bet 的数值
- \'texas.fold\'：放弃，本局直接认输

德州扑克的相关规则可看 https://zhuanlan.zhihu.com/p/682181951

有 bug 或反馈意见可联系邮箱 link_age@qq.com，邮件主题为 \'koishi德扑插件反馈\'
`

export interface Config {
  defaultJoinBet: number
  defualtSmallBlind: number
  defaultBigBlind: number
  playerCanSetBet: boolean
  shuffleTimes: number
  raiseProportion: number
  enableAllTableCards: boolean
  maxPlayerCount; number
  maxGameHistoryCount: number
  // enableShortenCommand: boolean
}

export const Config: Schema<Config> = Schema.object({
  defaultJoinBet: Schema.number().default(500).description(`加入房间携带的默认赌注数量`),
  defualtSmallBlind: Schema.number().default(5).description(`小盲注`),
  defaultBigBlind: Schema.number().default(10).description(`大盲注`),
  playerCanSetBet: Schema.boolean().default(false).description(`玩家是否可以自行修改赌注`),
  shuffleTimes: Schema.number().default(5).description(`洗牌次数`),
  raiseProportion: Schema.number().default(2).description(`本次加注至少是上次加注的多少倍`),
  enableAllTableCards: Schema.boolean().default(false).description(`是否允许最终牌型不包含手牌`),
  maxPlayerCount: Schema.number().default(15).description(`房间中最大玩家数量`),
  maxGameHistoryCount: Schema.number().default(40).description(`每个群组可存储的历史牌局记录的最大数量`)
  // enableShortenCommand: Schema.boolean().default(false).
  //   description(`是否允许简化指令（不需要texas）（危险！当您确定这样做不会与别的指令发生冲突时使用）`)
})

declare module 'koishi' {
  interface Tables {
    texas_game_playing_record: TexasGamePlayingRecord
    texas_game_room_record: TexasGameRoomRecord
    texas_game_history: TexasGameHistory
    texas_user_map: TexasUserMap
  }
}

// 记录一整局游戏的信息
export interface TexasGamePlayingRecord {
  id: number
  channelId: string
  guildId: string
  // 桌面牌
  deckTable: string[]
  // 开始时间
  gameTime: number

  // 玩家信息
  playerUserIds: string[]
  playerUserNames: string[]
  playerIndices: number[]


  // 对局信息
  // 玩家手牌
  playerHands: string[]
  // 玩家筹码
  playerStakes: number[]
  // 玩家下注
  playerBets: number[]
  // 玩家本轮下注
  playerTurnBets: number[]
  // 当前操作玩家次序
  currentPlayerIndex: number
  // 上一个加注者次序
  lastRaisePlayerIndex: number
  // 上次所加的注
  lastRaiseBet: number
  // 庄家次序
  buttonPlayerIndex: number
  // 小盲注次序
  smallBlidPlayerIndex: number
  // 大盲注次序
  bigBlidPlayerIndex: number
  // all-in玩家次序
  allinPlayerIndexs: number[]
  // fold玩家次序
  foldPlayerIndex: number[]
  // 当前回合
  currentTurn: string
}

// 游戏房间，每个群同时只有一个房间
export interface TexasGameRoomRecord {
  id: number
  channelId: string
  guildId: string

  // 玩家信息
  playerUserIds: string[]
  playerUserNames: string[]
  playerStakes: number[]

  // 玩家次序
  playerIndices: number[]

  // 庄家位置
  buttonPlayerIndex: number

  // 房间状态
  gameState: string

  // 房主，可修改玩家次序
  roomMakerId: string
  roomMakerName: string
}

// 查询玩家所在的对局
export interface TexasUserMap {
  playerUserId : string
  gameChannelId : string
  gameGuildId : string
}

// 历史信息记录，用于查询历史对局
export interface TexasGameHistory {
  id: number
  gameTime: number
  
  channelId: string
  guildId: string

  playerIndices: number[]

  deckTable: string[]

  playerUserIds: string[]
  playerUserNames: string[]
  playerStakes: number[]

  playerHands: string[]
  playerHandTypes: string[]

  buttonPlayerIndex: number
  winningPlayerIndex: number[]

  playerResult: number[]
}

const initialDeck = [
  '♥️A', '♥️2', '♥️3', '♥️4', '♥️5', '♥️6', '♥️7', '♥️8', '♥️9', '♥️10', '♥️J', '♥️Q', '♥️K',
  '♦️A', '♦️2', '♦️3', '♦️4', '♦️5', '♦️6', '♦️7', '♦️8', '♦️9', '♦️10', '♦️J', '♦️Q', '♦️K',
  '♣️A', '♣️2', '♣️3', '♣️4', '♣️5', '♣️6', '♣️7', '♣️8', '♣️9', '♣️10', '♣️J', '♣️Q', '♣️K',
  '♠️A', '♠️2', '♠️3', '♠️4', '♠️5', '♠️6', '♠️7', '♠️8', '♠️9', '♠️10', '♠️J', '♠️Q', '♠️K'
]

enum CardType {
  HighCard,
  Pair,
  TwoPair,
  ThreeOfOne,
  Straight,
  Flush,
  FullHouse,
  FourOfOne,
  StraightFlush,
  RoyalFlush
}

interface Card5 {
  cards : string[]
  // 牌型标号
  cardType : number
  // 牌点数
  cardNums : number[]
  // 牌型相同时需要比较的数字
  cmpNums : number[]
}

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  const {
    defaultJoinBet,
    defualtSmallBlind,
    defaultBigBlind,
    playerCanSetBet,
    shuffleTimes,
    raiseProportion,
    enableAllTableCards,
    maxPlayerCount,
    maxGameHistoryCount,
    // enableShortenCommand
  } = config

  ctx.model.extend('texas_game_playing_record', {
    id: 'unsigned',
    
    channelId: 'string',
    guildId: 'string',
    // 桌面牌
    deckTable: 'list',
    // 开始时间
    gameTime: 'unsigned',

    // 玩家信息
    playerUserIds: 'list',
    playerUserNames: 'list',

    // 玩家次序->编号
    playerIndices: 'array',
    
    // 对局信息
    // 玩家手牌
    playerHands: 'list',
    // 玩家筹码
    playerStakes: 'array',
    // 玩家下注
    playerBets: 'array',
    // 玩家本轮下注
    playerTurnBets: 'array',
    // 当前玩家次序
    currentPlayerIndex: 'integer',
    // 上一个加注者次序
    lastRaisePlayerIndex: 'integer',
    // 上次所加的注
    lastRaiseBet: 'integer',
    // 庄家次序
    buttonPlayerIndex: 'integer',
    // 小盲注次序
    smallBlidPlayerIndex: 'integer',
    // 大盲注次序
    bigBlidPlayerIndex: 'integer',
    // all-in玩家次序
    allinPlayerIndexs: 'array',
    // fold玩家次序
    foldPlayerIndex: 'array',
    // 当前回合
    currentTurn: 'string'
  }, {
    primary: 'id',
    autoInc: true
  })

  ctx.model.extend('texas_game_room_record', {
    
    id: 'unsigned',
    channelId: 'string',
    guildId: 'string',

    // 玩家信息
    playerUserIds: 'list',
    playerUserNames: 'list',
    playerStakes: 'array',

    // 玩家次序->编号
    playerIndices: 'array',

    // 庄家位置
    buttonPlayerIndex: 'integer',

    // 房间状态
    gameState: 'string',

    roomMakerId: 'string',
    roomMakerName: 'string'
  }, { 
    primary: 'id',
    autoInc: true
  })

  ctx.model.extend('texas_user_map', {
    playerUserId : 'string',
    gameChannelId : 'string',
    gameGuildId : 'string'
  }, {
    primary : 'playerUserId'
  })

  ctx.model.extend('texas_game_history', {
    
    id: 'unsigned',
    gameTime: 'unsigned',
    channelId: 'string',
    guildId: 'string',

    // 玩家次序
    playerIndices: 'array',

    deckTable: 'list',

    playerUserIds: 'list',
    playerUserNames: 'list',
    playerStakes: 'array',

    playerHands: 'list',
    playerHandTypes: 'list',

    buttonPlayerIndex: 'unsigned',
    winningPlayerIndex: 'array',

    playerResult: 'array',

  }, { 
    primary: 'id',
    autoInc: true
  })

  // 每次接收消息都会调用一次，检测当前游戏是否进行过久
  ctx.on('message', async (session) => {

    if (!session.content.startsWith('texas.')) {
      return
    }

    let channelId = session.channelId, guildId = session.guildId

    let searchResult = await ctx.database.get('texas_game_playing_record', {channelId, guildId})

    if (searchResult.length === 0) {
      return
    }
    else if (searchResult.length === 1) {
      let curTime = Date.now()
      let rec = searchResult[0]
      let gameTime = rec.gameTime
      if (curTime - gameTime > Time.minute * 30) {
        session.send(`检测到上一局游戏超过30分钟无人操作，已作废，将删除房间中信息，请稍候`)

        await ctx.database.remove('texas_game_playing_record', {channelId, guildId})
        await ctx.database.remove('texas_game_room_record', {channelId, guildId})
        await ctx.database.remove('texas_user_map', {gameChannelId : channelId, gameGuildId : guildId})

        session.send(`已删除，接下来可正常使用`)
      }
    }
    else {
      session.send('数据库可能发生错误，请删除数据库文件后重启机器人')
    }

  })

  // 加入游戏并设置筹码，默认筹码为defaultJoinBet
  ctx.command('texas.join [bet:number]', `加入游戏并设置筹码，默认为${defaultJoinBet}`).alias('texas.j')
    .action(async ({session}, bet = defaultJoinBet) => {

      let {channelId, userId, username, user, guildId} = session

      bet = Math.floor(bet)

      // 必须是在群聊中加入
      if (!guildId) {
        session.send(`请在一个群组内加入游戏`)
        return 
      }

      // session.send(`c: ${channelId}, g: ${guildId}, u: ${userId}, un: ${username}`)

      // username = getSessionUserName(session)

      // 获取群聊对应的房间，不存在则创建一个
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      // 获取用户对应的房间，不存在则允许加入
      const userMap = await ctx.database.get('texas_user_map', {playerUserId: userId})

      if (userMap.length > 0) {
        session.send(`@${username}，您已在其他群组中参与游戏`)
        return
      }
      
      if (searchResult.length === 0) {
        session.send('还没有房间哦，正在为群聊创建新房间')
        await ctx.database.create('texas_game_room_record', {
          channelId,
          guildId,
          playerUserIds: [userId],
          playerUserNames: [username],
          playerStakes: [bet],
          playerIndices: [0],
          buttonPlayerIndex: 0,
          gameState: 'waiting',
          roomMakerId: userId,
          roomMakerName: username
        })  

        await ctx.database.create('texas_user_map', {
          playerUserId : userId,
          gameChannelId : channelId,
          gameGuildId : guildId
        })

        session.sendQueued(`房间已创建，@${username}成为了房主`)
        return 
      } 

      const gameRoom = searchResult[0]

      // 已在房间中
      if (gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您已在房间中`)
        return
      }
      // 房间正在游戏
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，抱歉正在游戏中，请稍后再来`)
        return 
      }
      if (gameRoom.gameState === 'waiting') {

        if (gameRoom.playerUserIds.length >= maxPlayerCount) {
          session.send(`@${username}，抱歉，当前房间已满人`)
          return
        }

        gameRoom.playerUserIds.push(userId)
        gameRoom.playerStakes.push(bet)
        gameRoom.playerUserNames.push(username)
        gameRoom.playerIndices.push(gameRoom.playerIndices.length)
        
        // 房间第一位玩家
        if (gameRoom.playerUserIds.length === 1) {
          gameRoom.roomMakerId = userId
          gameRoom.roomMakerName = username

          await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
            roomMakerId : gameRoom.roomMakerId,
            roomMakerName : gameRoom.roomMakerName,
            buttonPlayerIndex : 0
          })
        }

        var message = `@${username}，您已成功加入房间，` + gameRoomToString(gameRoom)

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          playerIndices : gameRoom.playerIndices,
          playerUserIds : gameRoom.playerUserIds,
          playerStakes : gameRoom.playerStakes,
          playerUserNames : gameRoom.playerUserNames
        })

        await ctx.database.create('texas_user_map', {
          playerUserId : userId,
          gameChannelId : channelId,
          gameGuildId : guildId
        })

        session.send(message)
      }
    })

  ctx.command('texas.leave', '离开房间').alias('texas.l')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session

      // 必须在群聊中退出
      if (!guildId) {
        session.send(`请在一个群组中退出房间`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})
      const userMap = await ctx.database.get('texas_user_map', {playerUserId : userId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您并没有参与此群组的游戏`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏开始了还想跑？`)
        return 
      }

      // 允许退出
      if (gameRoom.playerUserIds.includes(userId) && gameRoom.gameState === 'waiting') {

        const playerCount = gameRoom.playerUserIds.length - 1

        // 没人了
        if (playerCount === 0) {
          await ctx.database.remove('texas_game_room_record', {channelId, guildId})
          await ctx.database.remove('texas_user_map', {playerUserId : userId})
          session.send('所有人都退出了房间，房间已关闭')
          return
        }

        var realIndex:number = gameRoom.playerUserIds.indexOf(userId), 
          index : number = -1
        for (var i = 0; i < playerCount + 1; i++) {
          if (gameRoom.playerIndices[i] == realIndex) {
            index = i
            break
          }
        }

        gameRoom.playerIndices.splice(index, 1)
        gameRoom.playerStakes.splice(realIndex, 1)
        gameRoom.playerUserIds.splice(realIndex, 1)
        gameRoom.playerUserNames.splice(realIndex, 1)

        // 若房主退出则选下一个人为房主（按次序）
        if (gameRoom.roomMakerId === userId) {
          let nextRealIndex = gameRoom.playerIndices[index%playerCount]
          gameRoom.roomMakerId = gameRoom.playerUserIds[nextRealIndex]
          gameRoom.roomMakerName = gameRoom.playerUserNames[nextRealIndex]
          await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
            roomMakerId : gameRoom.roomMakerId,
            roomMakerName : gameRoom.roomMakerName
          })
        }

        // 若庄家退出则选下一个人为庄家
        if (gameRoom.buttonPlayerIndex === index) {
          gameRoom.buttonPlayerIndex = index%playerCount
          await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
            buttonPlayerIndex : gameRoom.buttonPlayerIndex
          })
        }
        else if (gameRoom.buttonPlayerIndex > index) {
          gameRoom.buttonPlayerIndex --
          await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
            buttonPlayerIndex : gameRoom.buttonPlayerIndex
          })
        }

        // 修改indices
        for (var i = 0; i < playerCount; i++) {
          if (gameRoom.playerIndices[i] >= realIndex)
            gameRoom.playerIndices[i]--;
        }

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          playerIndices : gameRoom.playerIndices,
          playerUserIds : gameRoom.playerUserIds,
          playerStakes : gameRoom.playerStakes,
          playerUserNames : gameRoom.playerUserNames
        })
        
        await ctx.database.remove('texas_user_map', {playerUserId : userId})

        // session.send(gameRoom.playerIndices.toString())

        session.send(`@${username}，您已成功离开房间，` + gameRoomToString(gameRoom))

        return
      }
    })

  // 可以修改自己的赌注
  ctx.command('texas.setbet <index:number> <bet:number>', '修改赌注，格式为setbet 玩家次序 赌注').alias('texas.sb')
    .action(async ({session}, index=0, bet=defaultJoinBet) => {
      let {channelId, userId, username, user, guildId} = session

      bet = Math.floor(bet)

      // 需在房间中修改 
      if (!guildId) {
        session.send('请在群组中修改你的赌注，不要偷偷修改')
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，如果想要修改赌注请先加入游戏`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，如果想要修改赌注请先加入游戏`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏已开始，无法修改赌注`)
        return 
      }

      // 若只允许房主修改
      if (!playerCanSetBet && userId != gameRoom.roomMakerId) {
        session.send(`@${username}，您不是房主，无权修改赌注`)
        return
      }

      // 判断index是否合法
      index --
      if (index < 0 || index >= gameRoom.playerUserIds.length) {
        session.send(`@${username}，所给次序不合法`)
        return
      } 

      index = gameRoom.playerIndices[index]

      if (gameRoom.gameState === 'waiting') {
        var oldbet = gameRoom.playerStakes[index]
        // 开始修改
        gameRoom.playerStakes[index] = bet 

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          playerStakes : gameRoom.playerStakes
        })

        session.send(`@${username} 将@${gameRoom.playerUserNames[index]} 的赌注从${oldbet}修改为${bet}，` + gameRoomToString(gameRoom))

        return
      }
    })

  // 交换两人的次序
  ctx.command('texas.swap <index1:number> <index2:number>', '交换两个玩家的次序').alias('texas.sw')
    .action(async ({session}, index1, index2) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法交换次序`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法交换次序`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏已开始，无法交换次序`)
        return 
      }

      // 只有房主可以交换次序
      if (userId != gameRoom.roomMakerId) {
        session.send(`@${username}，您不是房主，无法交换次序`)
        return
      }

      var playerCount = gameRoom.playerUserIds.length

      index1 --
      index2 --

      if (index1 < 0 || index1 >= playerCount || index2 < 0 || index2 >= playerCount) {
        session.send(`@${username}，交换次序不合法`)
        return
      }
      
      // 可以交换
      if (userId === gameRoom.roomMakerId && gameRoom.gameState === 'waiting') {
        var indice1 = gameRoom.playerIndices[index1]
        var indice2 = gameRoom.playerIndices[index2]
        gameRoom.playerIndices[index1] = indice2
        gameRoom.playerIndices[index2] = indice1

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          playerIndices : gameRoom.playerIndices
        })

        session.send(`@${username}，交换了${index1+1}和${index2+1}的玩家，` + gameRoomToString(gameRoom))
        return 
      }
    })

  // 设置房主
  ctx.command('texas.setowner <index:number>', '设置指定次序的玩家为房主').alias('texas.so')
    .action(async ({session}, index) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法设置房主`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法设置房主`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏已开始，无法设置房主`)
        return 
      }

      // 只有房主可以
      if (userId != gameRoom.roomMakerId) {
        session.send(`@${username}，您不是房主，无法设置房主`)
        return
      }

      var playerCount = gameRoom.playerUserIds.length
      index --

      if (index < 0 || index >= playerCount) {
        session.send(`@${username}，所给次序不合法`)
        return
      }

      if (userId === gameRoom.roomMakerId && gameRoom.gameState === 'waiting') {
        var indice = gameRoom.playerIndices[index]

        gameRoom.roomMakerId = gameRoom.playerUserIds[indice]
        gameRoom.roomMakerName = gameRoom.playerUserNames[indice]

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          roomMakerId : gameRoom.roomMakerId,
          roomMakerName : gameRoom.roomMakerName
        })

        session.send(`@${gameRoom.roomMakerName} 成为了新的房主，` + gameRoomToString(gameRoom))
      }
      
    })

  // 设置庄位
  ctx.command('texas.setbutton <index:number>', '设置指定次序的玩家为庄')
    .action(async ({session}, index) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法设置庄家`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法设置庄家`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏已开始，无法设置庄家`)
        return 
      }

      // 只有房主可以
      if (userId != gameRoom.roomMakerId) {
        session.send(`@${username}，您不是房主，无法设置庄家`)
        return
      }

      var playerCount = gameRoom.playerUserIds.length
      index --

      if (index < 0 || index >= playerCount) {
        session.send(`@${username}，所给次序不合法`)
        return
      }

      if (userId === gameRoom.roomMakerId && gameRoom.gameState === 'waiting') {

        gameRoom.buttonPlayerIndex = index

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          buttonPlayerIndex : gameRoom.buttonPlayerIndex
        })

        session.send(`@${gameRoom.playerUserNames[index]} 成为了新的庄家，` + gameRoomToString(gameRoom))
        return
      }
    })

  // 获取房间信息
  ctx.command('texas.info', '查询房间信息').alias('texas.i')
    .action(async ({session}, index) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法查询`)
        return
      }

      var gameRoom = searchResult[0]

      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，` + gameRoomToString(searchResult[0]))
        return
      }
      else if (gameRoom.gameState === 'playing') {
        let gamePlayingRec = await ctx.database.get('texas_game_playing_record', {channelId, guildId})
        assert (gamePlayingRec.length > 0)
        session.send(`@${username}，` + gamePlayingRecToString(gamePlayingRec[0]))
      }
    })

  // 开始一局游戏
  ctx.command('texas.start', '开始游戏（仅房主）').alias('texas.st')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法开始游戏`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法开始游戏`)
        return 
      }

      // 必须在游戏未开始时
      if (gameRoom.gameState === 'playing') {
        session.send(`@${username}，游戏已经开始了`)
        return 
      }

      // 只有房主可以
      if (userId != gameRoom.roomMakerId) {
        session.send(`@${username}，您不是房主，无法开始游戏`)
        return
      }

      if (userId === gameRoom.roomMakerId && gameRoom.gameState === 'waiting') {

        let playerCount = gameRoom.playerUserIds.length

        if (playerCount <= 2) {
          session.send(`@${username}，当前房间不足3人，无法开始游戏`)
          return
        }

        for (var i = 0; i < playerCount; i++) {
          let index = gameRoom.playerIndices[i]
          if (gameRoom.playerStakes[index] < defaultBigBlind) {
            session.send(`@${i+1} ${gameRoom.playerUserNames[index]}，您的赌注不足${defaultBigBlind}，无法开始游戏`)
            return 
          }
        }

        let deck = ShuffleMultipleTimes(initialDeck, shuffleTimes)

        let hands : string[] = [], deckStart = 0, bets : number[] = []

        for (var i = 0; i < playerCount; i++) {
          // test
          // hands.push('♥️2')
          // hands.push('♥️2')

          hands.push(deck[deckStart])
          hands.push(deck[deckStart+1])
          bets.push(0)
          deckStart += 2
        }

        gameRoom.gameState = 'playing' 

        await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
          gameState : gameRoom.gameState
        })

        await ctx.database.create('texas_game_playing_record', {
          channelId,
          guildId,
          gameTime : Date.now(),
          deckTable : [deck[deckStart+1], deck[deckStart+2], deck[deckStart+3], deck[deckStart+5], deck[deckStart+7]],
          playerUserIds : gameRoom.playerUserIds,
          playerUserNames : gameRoom.playerUserNames,
          playerIndices : gameRoom.playerIndices,

          playerHands : hands,
          playerStakes : gameRoom.playerStakes,
          playerBets : bets,
          playerTurnBets : bets,
          currentPlayerIndex : (gameRoom.buttonPlayerIndex + 1) % playerCount,
          lastRaisePlayerIndex : gameRoom.buttonPlayerIndex,
          lastRaiseBet : 0,
          buttonPlayerIndex : gameRoom.buttonPlayerIndex,
          smallBlidPlayerIndex : (gameRoom.buttonPlayerIndex + 1) % playerCount,
          bigBlidPlayerIndex : (gameRoom.buttonPlayerIndex + 2) % playerCount,
          allinPlayerIndexs : [],
          foldPlayerIndex : [],
          currentTurn : 'preflop'
        })

        const searchResultRec = await ctx.database.get('texas_game_playing_record', {channelId, guildId})

        assert(searchResultRec.length > 0)

        var gamePlayingRec = searchResultRec[0]

        session.send('游戏已开始，' + gamePlayingRecToString(gamePlayingRec))
        return
      }
    })

  // 加注命令，加注至命令，all-in命令逻辑类似，使用了同一个函数raiseHelperFunc
  ctx.command('texas.raise <bet:number>', '加注').alias('texas.r')
    .action(async ({session}, bet) => {
      let {channelId, userId, username, user, guildId} = session

      bet = Math.floor(bet)
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法加注`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法加注`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {
        if (bet < 0) {
          session.send(`@${username}}，您不能下负注`)
        }
        await raiseHelperFunc(ctx, session, bet)
      }
      
    })

  // 加注至
  ctx.command('texas.raiseto <bet:number>', '加注至').alias('texas.rt')
    .action(async ({session}, bet) => {
      let {channelId, userId, username, user, guildId} = session

      bet = Math.floor(bet)
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法加注`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法加注`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {
        if (bet < 0) {
          session.send(`@${username}}，您不能下负注`)
        }
        await raiseHelperFunc(ctx, session, bet, true)
      }
    })

  // allin
  ctx.command('texas.all', 'all-in').alias('texas.a')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法加注`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法加注`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {
        // bet 为 -1 是 all-in
        await raiseHelperFunc(ctx, session, -1, true)
      }
    })

  async function raiseHelperFunc(ctx, session, bet, raiseTo = false) {

    let {channelId, userId, username, user, guildId} = session

    let gamePlayingRec = (await ctx.database.get('texas_game_playing_record', {channelId, guildId}))[0]

    let realIndex = gamePlayingRec.playerIndices[gamePlayingRec.currentPlayerIndex]
    
    let message = ''

    if (gamePlayingRec.playerUserIds[realIndex] != userId) {
      session.send(`@${username}，还未到你操作`)
      return
    }
    else {

      // 大小盲注特判
      if ((gamePlayingRec.currentPlayerIndex === gamePlayingRec.smallBlidPlayerIndex && 
        gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.smallBlidPlayerIndex]] == 0 &&
        gamePlayingRec.currentTurn === 'preflop') || 
        (gamePlayingRec.currentPlayerIndex === gamePlayingRec.bigBlidPlayerIndex && 
        gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.bigBlidPlayerIndex]] == 0 &&
        gamePlayingRec.currentTurn === 'preflop')
      ) {
        session.send(`@${username}，请使用 call 指令来下盲注`)
        return
      }

      let mustbet = Math.floor(gamePlayingRec.lastRaiseBet*raiseProportion) > defaultBigBlind ? 
        Math.floor(gamePlayingRec.lastRaiseBet*raiseProportion) : defaultBigBlind
      let curBet = gamePlayingRec.playerBets[realIndex]
      let curStake = gamePlayingRec.playerStakes[realIndex]
      let curTurnBet = gamePlayingRec.playerTurnBets[realIndex]

      // bet 为 -1 是all-in
      if (bet === -1) {
        bet = curStake
        bet = bet - curBet + curTurnBet
      }
      if (raiseTo) {
        bet = bet - curTurnBet
      }

      if (curStake < curBet + bet) {
        session.send(`@${username}，您的筹码不足`)
        return
      }
      // 玩家选择 all-in
      else if (curStake === curBet + bet) {
        curBet += bet
        curTurnBet += bet 
        gamePlayingRec.playerBets[realIndex] = curBet 
        gamePlayingRec.playerTurnBets[realIndex] = curTurnBet
        gamePlayingRec.allinPlayerIndexs.push(gamePlayingRec.currentPlayerIndex)
        gamePlayingRec.lastRaisePlayerIndex = curTurnBet > gamePlayingRec.lastRaiseBet ? 
          gamePlayingRec.currentPlayerIndex : gamePlayingRec.lastRaisePlayerIndex
        gamePlayingRec.lastRaiseBet = curTurnBet > gamePlayingRec.lastRaiseBet ? 
          curTurnBet : gamePlayingRec.lastRaiseBet

        await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
          lastRaiseBet : gamePlayingRec.lastRaiseBet,
          allinPlayerIndexs : gamePlayingRec.allinPlayerIndexs,
          lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex,
          playerBets : gamePlayingRec.playerBets,
          playerTurnBets : gamePlayingRec.playerTurnBets
        })

        message += `${username}选择all-in，本轮赌注为${gamePlayingRec.lastRaiseBet}，`
        
      } 
      else if (curTurnBet + bet < mustbet) {
        session.send(`@${username}，您的加注不能小于${mustbet-curTurnBet}`)
        return 
      }
      // 正常加注
      else {

        curTurnBet += bet
        curBet += bet
        
        gamePlayingRec.playerTurnBets[realIndex] = curTurnBet
        gamePlayingRec.playerBets[realIndex] = curBet
        gamePlayingRec.lastRaiseBet = curTurnBet
        gamePlayingRec.lastRaisePlayerIndex = gamePlayingRec.currentPlayerIndex

        await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
          lastRaiseBet : gamePlayingRec.lastRaiseBet,
          lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex,
          playerBets : gamePlayingRec.playerBets,
          playerTurnBets : gamePlayingRec.playerTurnBets
        })

        message += `${username}将本轮赌注增加至${curTurnBet}，`
      }
      gamePlayingRec = gamePlayingRecUpdate(gamePlayingRec)

      await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
        currentTurn : gamePlayingRec.currentTurn,
        currentPlayerIndex : gamePlayingRec.currentPlayerIndex
      })
      
      message += gamePlayingRecToString(gamePlayingRec)
      session.send(message)
      
      if (gamePlayingRec.currentTurn === 'end') {
        gamePlayingRecEnd(gamePlayingRec, session)
        return
      }
      else {
        return
      }
    }
  }

  // 跟注命令
  ctx.command('texas.call', '跟注').alias('texas.c')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法跟注`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法跟注`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {
        let gamePlayingRec = (await ctx.database.get('texas_game_playing_record', {channelId, guildId}))[0]

        let realIndex = gamePlayingRec.playerIndices[gamePlayingRec.currentPlayerIndex]
        
        let message = ''

        if (gamePlayingRec.playerUserIds[realIndex] != userId) {
          session.send(`@${username}，还未到你操作`)
          return
        }
        else {
          // 对大小盲注特判
          if (gamePlayingRec.currentPlayerIndex === gamePlayingRec.smallBlidPlayerIndex && 
            gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.smallBlidPlayerIndex]] == 0 &&
            gamePlayingRec.currentTurn === 'preflop'
          ) {
            gamePlayingRec.playerBets[realIndex] = defualtSmallBlind
            gamePlayingRec.playerTurnBets[realIndex] = defualtSmallBlind
            gamePlayingRec.lastRaiseBet = defualtSmallBlind
            gamePlayingRec.lastRaisePlayerIndex = gamePlayingRec.currentPlayerIndex

            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              playerBets : gamePlayingRec.playerBets,
              playerTurnBets : gamePlayingRec.playerTurnBets,
              lastRaiseBet : gamePlayingRec.lastRaiseBet,
              lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex
            })

            gamePlayingRec = gamePlayingRecUpdate(gamePlayingRec)
            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              currentTurn : gamePlayingRec.currentTurn,
              currentPlayerIndex : gamePlayingRec.currentPlayerIndex,
              lastRaiseBet : gamePlayingRec.lastRaiseBet,
              lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex,
              playerTurnBets : gamePlayingRec.playerTurnBets
            })

            message = `${username}下注 ${defualtSmallBlind}，` + gamePlayingRecToString(gamePlayingRec)

            session.send(message)

            return
          }
          else if (gamePlayingRec.currentPlayerIndex === gamePlayingRec.bigBlidPlayerIndex && 
            gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.bigBlidPlayerIndex]] == 0 &&
            gamePlayingRec.currentTurn === 'preflop'
          ) {
            gamePlayingRec.lastRaiseBet = defaultBigBlind

            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              lastRaiseBet : defaultBigBlind
            })

            gamePlayingRec.lastRaisePlayerIndex = gamePlayingRec.currentPlayerIndex
          }

          let curBet = gamePlayingRec.playerBets[realIndex]
          let curTurnBet = gamePlayingRec.playerTurnBets[realIndex]
          let curStake = gamePlayingRec.playerStakes[realIndex]
          
          if (curStake < curBet + gamePlayingRec.lastRaiseBet - curTurnBet) {
            session.send(`@${username}，您的总下注应至${curBet + gamePlayingRec.lastRaiseBet - curTurnBet}，`+
              `您的赌注不足，可以考虑all-in`)
            return
          }
          // 变相all-in
          else if (curStake === curBet + gamePlayingRec.lastRaiseBet - curTurnBet) {
            curBet = gamePlayingRec.playerBets[realIndex] + gamePlayingRec.lastRaiseBet - curTurnBet
            curTurnBet = gamePlayingRec.lastRaiseBet 
            gamePlayingRec.playerBets[realIndex] = curBet 
            gamePlayingRec.allinPlayerIndexs.push(gamePlayingRec.currentPlayerIndex)
            gamePlayingRec.playerTurnBets[realIndex] = curTurnBet

            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              allinPlayerIndexs : gamePlayingRec.allinPlayerIndexs,
              playerBets : gamePlayingRec.playerBets,
              playerTurnBets : gamePlayingRec.playerTurnBets
            })

            message += `${username}选择all-in，`
          }
          // 正常跟注
          else {
            curTurnBet = gamePlayingRec.lastRaiseBet
            curBet += curTurnBet - gamePlayingRec.playerTurnBets[realIndex]
            gamePlayingRec.playerTurnBets[realIndex] = curTurnBet
            gamePlayingRec.playerBets[realIndex] = curBet

            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              playerBets : gamePlayingRec.playerBets
            })

            // 大盲特判回复
            if (gamePlayingRec.currentPlayerIndex === gamePlayingRec.bigBlidPlayerIndex && 
              gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.bigBlidPlayerIndex]] == defaultBigBlind &&
              gamePlayingRec.currentTurn === 'preflop'
            ) {
              message += `${username}下注 ${defaultBigBlind}，`
            }
            else {
              message += `${username}跟注至 ${curTurnBet}，`
            }
          }

          gamePlayingRec = gamePlayingRecUpdate(gamePlayingRec)

          if (gamePlayingRec.currentTurn != 'end') {
            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              currentTurn : gamePlayingRec.currentTurn,
              currentPlayerIndex : gamePlayingRec.currentPlayerIndex,
              lastRaiseBet : gamePlayingRec.lastRaiseBet,
              lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex,
              playerTurnBets : gamePlayingRec.playerTurnBets
            })
          }

          message += gamePlayingRecToString(gamePlayingRec)
          session.send(message)
          
          if (gamePlayingRec.currentTurn === 'end') {
            gamePlayingRecEnd(gamePlayingRec, session)
            return
          }
          else {
            return
          }
        }
      }
    })

  // 放弃命令
  ctx.command('texas.fold', '放弃').alias('texas.f')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在群聊中
      if (!guildId) {
        session.send(`请在一个群组中使用此命令`)
        return
      }

      // 获取群聊对应的房间
      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        session.send(`@${username}，群组中还没有房间，无法跟注`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (! gameRoom.playerUserIds.includes(userId)) {
        session.send(`@${username}，您不在房间中，无法跟注`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`@${username}，游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {
        let gamePlayingRec = (await ctx.database.get('texas_game_playing_record', {channelId, guildId}))[0]

        let realIndex = gamePlayingRec.playerIndices[gamePlayingRec.currentPlayerIndex]
        
        let message = ''

        if (gamePlayingRec.playerUserIds[realIndex] != userId) {
          session.send(`@${username}，还未到你操作`)
          return
        }
        else {

          // 大小盲注特判
          if ((gamePlayingRec.currentPlayerIndex === gamePlayingRec.smallBlidPlayerIndex && 
            gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.smallBlidPlayerIndex]] == 0 &&
            gamePlayingRec.currentTurn === 'preflop') || 
            (gamePlayingRec.currentPlayerIndex === gamePlayingRec.bigBlidPlayerIndex && 
            gamePlayingRec.playerBets[gamePlayingRec.playerIndices[gamePlayingRec.bigBlidPlayerIndex]] == 0 &&
            gamePlayingRec.currentTurn === 'preflop')
          ) {
            session.send(`@${username}，您必须下出盲注，不要动歪心思~`)
            return
          }

          gamePlayingRec.foldPlayerIndex.push(gamePlayingRec.currentPlayerIndex)

          // 特判: 新的一轮开始就fold
          if (gamePlayingRec.currentPlayerIndex === gamePlayingRec.lastRaisePlayerIndex) {
            gamePlayingRec.lastRaisePlayerIndex = (gamePlayingRec.lastRaisePlayerIndex + 1) % gamePlayingRec.playerUserId.length
            
            await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
              lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex
            })
          }

          await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
            foldPlayerIndex : gamePlayingRec.foldPlayerIndex
          })

          message += `${username}选择了fold，`
        }

        gamePlayingRec = gamePlayingRecUpdate(gamePlayingRec)

        await ctx.database.set('texas_game_playing_record', {channelId, guildId}, {
          currentTurn : gamePlayingRec.currentTurn,
          currentPlayerIndex : gamePlayingRec.currentPlayerIndex,
          lastRaiseBet : gamePlayingRec.lastRaiseBet,
          lastRaisePlayerIndex : gamePlayingRec.lastRaisePlayerIndex,
          playerTurnBets : gamePlayingRec.playerTurnBets
        })
        
        message += gamePlayingRecToString(gamePlayingRec)
        session.send(message)
        
        if (gamePlayingRec.currentTurn === 'end') {
          gamePlayingRecEnd(gamePlayingRec, session)
          return
        }
        else {
          return
        }
      }
    })

  ctx.command('texas.hands', '查看自己的手牌（私聊）').alias('texas.hand').alias('texas.h')
    .action(async ({session}) => {
      let {channelId, userId, username, user, guildId} = session
      
      // 必须在私聊中
      if (guildId) {
        session.send(`@${username}，在群组中询问会公开您的手牌，请在私聊中使用此命令`)
        return
      }

      // 获取群聊对应的房间

      const userMap = await ctx.database.get('texas_user_map', {playerUserId : userId})

      assert(userMap.length <= 1)

      if (userMap.length === 0) {
        session.send(`您并未参与游戏，没有手牌`)
        return
      }

      let roomInfo = userMap[0]

      channelId = roomInfo.gameChannelId, guildId = roomInfo.gameGuildId

      const searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

      if (searchResult.length === 0) {
        ctx.database.remove('texas_user_map', {playerUserId : userId})
        console.log(`数据库出现错误，将删除有关数据`)
        return
      }

      var gameRoom = searchResult[0]

      // 必须在房间中
      if (!gameRoom.playerUserIds.includes(userId)) {
        ctx.database.remove('texas_user_map', {playerUserId : userId})
        console.log(`数据库出现错误，将删除有关数据`)
        return 
      }

      // 必须在游戏开始时
      if (gameRoom.gameState === 'waiting') {
        session.send(`游戏还未开始呢~`)
        return 
      }

      if (gameRoom.gameState === 'playing') {

        let rec = (await ctx.database.get('texas_game_playing_record', {channelId, guildId}))[0]

        let playerCount = gameRoom.playerUserIds.length
        let realIndex = gameRoom.playerUserIds.indexOf(userId)
        let message = '这是您的手牌，请不要告诉其他人\n'

        message += rec.playerHands[realIndex] + ' ' + rec.playerHands[realIndex + playerCount]

        session.send(message)
      }
    })

  ctx.command('texas.history <num:number>', `查看本群历史对局（最近${maxGameHistoryCount}局），数字参数表示页数，-i id 查看具体对局`)
    .option('gameId', '-i <gameId:number>', {fallback : -1})
    .action(async ({session, options}, num = 1) => {
      let {channelId, guildId, userId, username} = session

      // 查询具体对局
      if (options.gameId > 0) {
        let searchResult = await ctx.database.get('texas_game_history', {id:options.gameId, channelId, guildId})

        if (searchResult.length > 0) {
          let gameHistory : TexasGameHistory = searchResult[0]
          session.send(`游戏时间：${getTime(gameHistory.gameTime)}\n` + gamePlayingHistoryToString(gameHistory))
        }
        else {
          session.send(`@${username}，抱歉，并没有找到 id 为 ${options.gameId} 的此房间对局`)
        }
      }
      else if (num > 0)
      {
        let searchResult = await ctx.database.get('texas_game_history', {channelId, guildId})
        let message = `查询历史对局，第 ${num} 页`

        searchResult.sort((a, b) => b.gameTime - a.gameTime)

        for (let i = (num-1) * 10; i < num*10; i++) {
          if (i < searchResult.length) {

            let winnerIndices = searchResult[i].winningPlayerIndex 
            let realIndex = searchResult[i].playerIndices[winnerIndices[0]]

            message += '\n' + `id:${searchResult[i].id} ${getTime(searchResult[i].gameTime)}：` + 
              `赢家：【${searchResult[i].playerUserNames[realIndex]}】` + 
              (winnerIndices.length > 1 ? `等${winnerIndices.length}人 ` : ' ') + 
              `牌型：${searchResult[i].playerHandTypes[realIndex]}`
          }
        }
        if (message === `查询历史对局，第 ${num} 页`) {
          message += '\n-空-'
        }

        session.send(message)
      }
    })

  // 获取用户名，不同平台处理方法有区别
  function getSessionUserName(session) : string {
    //--

    return 'none'
  }

  // 时间戳转字符串
  function getTime(timestamp : number) : string {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth()+1).toString().padStart(2,'0')
    const day = date.getDate().toString().padStart(2,'0')

    const hour = date.getHours().toString().padStart(2,'0')
    const minute = date.getMinutes().toString().padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  // 洗牌，Fisher-Yate算法
  function Shuffle(decks : string[]) : string[] {
    const len = decks.length
    for (let i = len - 1; i >= 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [decks[i], decks[j]] = [decks[j], decks[i]]
    }
    return decks
  }
  function ShuffleMultipleTimes(decks : string[], num : number) : string[] {
    let ret = decks.slice()
    for (var i = 0; i < num; i++) {
      ret = Shuffle(ret)
    }
    return ret
  }

  // 提示房间状态的消息
  function gameRoomToString(rec : TexasGameRoomRecord) : string {

    if (rec.gameState === 'waiting') {
      var len = rec.playerUserIds.length
      var message = `目前房间有${len}人，房主为${rec.roomMakerName}\n玩家次序为：`
      for (var i = 0; i < len; i++) {
        var index = rec.playerIndices[i]
        message = message + '\n' + (i+1) + ' ' + rec.playerUserNames[index] + ' ' + rec.playerStakes[index]
      }
      message = message + '\n' + `庄家将是${rec.buttonPlayerIndex+1} ${rec.playerUserNames[rec.playerIndices[rec.buttonPlayerIndex]]}`
      return message
    }
  }

  // 提示游戏状态的消息
  function gamePlayingRecToString(rec : TexasGamePlayingRecord) : string {

    var sum = 0, len = rec.playerUserIds.length
    for (var i = 0; i < len; i++) {
      sum += rec.playerBets[i]
    }

    if (rec.currentTurn === 'preflop') {

      var message = `当前回合为：preflop，目前池内筹码总数为${sum}，` + 
        `上一位叫注玩家为${rec.lastRaisePlayerIndex+1}: ` + 
        `${rec.playerUserNames[rec.playerIndices[rec.lastRaisePlayerIndex]]}` + 
        '\n' + `牌桌：未翻牌`

      if (rec.currentPlayerIndex === rec.smallBlidPlayerIndex && 
        rec.playerBets[rec.playerIndices[rec.smallBlidPlayerIndex]] == 0
      ) {
        let index = rec.playerIndices[rec.smallBlidPlayerIndex]
        message = message + '\n' + `请小盲注玩家${rec.currentPlayerIndex+1} ${rec.playerUserNames[index]} 下注 ${defualtSmallBlind}` + 
          `\n(使用 call 指令)`
        return message
      }
      else if (rec.currentPlayerIndex === rec.bigBlidPlayerIndex &&
        rec.playerBets[rec.playerIndices[rec.bigBlidPlayerIndex]] == 0
      ) {
        let index = rec.playerIndices[rec.bigBlidPlayerIndex]
        message = message + '\n' + `请大盲注玩家${rec.currentPlayerIndex+1} ${rec.playerUserNames[index]} 下注 ${defaultBigBlind}` + 
          `\n(使用 call 指令)`
        return message
      }
    }
    else if (rec.currentTurn === 'flop') {
      var message = `当前回合为：flop，目前池内筹码总数为${sum}，` +
        `上一位叫注玩家为${rec.lastRaisePlayerIndex+1}: ` + 
        `${rec.playerUserNames[rec.playerIndices[rec.lastRaisePlayerIndex]]}` + 
        '\n' + `牌桌：` +
        `${rec.deckTable[0]} ${rec.deckTable[1]} ${rec.deckTable[2]}`
    }
    else if (rec.currentTurn === 'turn') {
      var message = `当前回合为：turn，目前池内筹码总数为${sum}，` +
      `上一位叫注玩家为${rec.lastRaisePlayerIndex+1}: ` + 
      `${rec.playerUserNames[rec.playerIndices[rec.lastRaisePlayerIndex]]}` + 
      '\n' + `牌桌：` + 
      `${rec.deckTable[0]} ${rec.deckTable[1]} ${rec.deckTable[2]} ${rec.deckTable[3]}`
    }
    else if (rec.currentTurn === 'river') {
      var message = `当前回合为：river，目前池内筹码总数为${sum}，` +
      `上一位叫注玩家为${rec.lastRaisePlayerIndex+1}: ` + 
      `${rec.playerUserNames[rec.playerIndices[rec.lastRaisePlayerIndex]]}` + 
      '\n' + `牌桌：` + 
      `${rec.deckTable[0]} ${rec.deckTable[1]} ${rec.deckTable[2]} ${rec.deckTable[3]} ${rec.deckTable[4]}`
    }
    else if (rec.currentTurn === 'end') {
      var message = `所有玩家操作结束，即将结算，目前池内筹码总数为${sum}，` +
      '\n' + `牌桌：` + 
      `${rec.deckTable[0]} ${rec.deckTable[1]} ${rec.deckTable[2]} ${rec.deckTable[3]} ${rec.deckTable[4]}`
    }
    

    for (var i = 0; i < len; i++) {
      message = message + '\n'
      let index = rec.playerIndices[i]

      if (rec.allinPlayerIndexs.includes(i)) {
        message += 'A '
      }
      else if (rec.foldPlayerIndex.includes(i)) {
        message += 'F '
      }
      else if (rec.currentPlayerIndex === i) {
        message += '# '
      }
      else {
        message += '  '
      }

      message += `${i+1} ${rec.playerUserNames[index]} 已下注: ${rec.playerBets[index]} ` + 
        `本轮下注：${rec.playerTurnBets[index]} 筹码: ${rec.playerStakes[index]}`
    }

    if (rec.currentTurn === 'end') {
      return message
    }

    let mustbet = Math.floor(rec.lastRaiseBet*raiseProportion) > defaultBigBlind ? 
      Math.floor(rec.lastRaiseBet*raiseProportion) : defaultBigBlind

    let realIndex = rec.playerIndices[rec.currentPlayerIndex]

    message += '\n' + `现在是${rec.currentPlayerIndex+1} ${rec.playerUserNames[realIndex]}操作，请选择` + '\n' + 
      `raise/raiseto 加注（至少加注至${mustbet}，需加${mustbet-rec.playerTurnBets[realIndex]}）  \n` + 
      `call 跟注${rec.lastRaiseBet-rec.playerTurnBets[realIndex]}（跟至${rec.lastRaiseBet}）  \n` + 
      `all all-in    \t` +
      `fold 放弃`
    

    return message
  }

  // 提示游戏结果的消息
  function gamePlayingHistoryToString(rec : TexasGameHistory) : string {
    let message = '本局结果\n赢家：'
    for (var i = 0; i < rec.winningPlayerIndex.length; i++) {
      let realIndex = rec.playerIndices[rec.winningPlayerIndex[i]]
      message += `${rec.playerUserNames[realIndex]}  `
    }

    message += '\n' + `${rec.deckTable[0]} ${rec.deckTable[1]}` + 
      ` ${rec.deckTable[2]} ${rec.deckTable[3]} ${rec.deckTable[4]}`

    let playerCount = rec.playerUserIds.length
    for (var i = 0; i < playerCount; i++) {
      let realIndex = rec.playerIndices[i]
      message += '\n'
      message += `${i+1} ${rec.playerUserNames[realIndex]} ` + 
        `${rec.playerStakes[realIndex]+rec.playerResult[realIndex]} ` + 
        (rec.playerResult[realIndex] >= 0 ? `(+${rec.playerResult[realIndex]})` : `(${rec.playerResult[realIndex]})`) + 
        `${rec.playerHands[realIndex]} ${rec.playerHands[realIndex+playerCount]} ${rec.playerHandTypes[realIndex]}`
    }

    return message
  }

  // 更新游戏状态
  function gamePlayingRecUpdate(rec : TexasGamePlayingRecord) : TexasGamePlayingRecord {
    let playerCount = rec.playerUserIds.length
    let curIndex = (rec.currentPlayerIndex + 1) % playerCount
    let lastRaisePlayerNextIndex = (rec.lastRaisePlayerIndex + 1) % playerCount

    // 判定是否达到结束条件
    // 即只剩一人未fold或未fold的人均all-in
    let foldCount = 0, allAllIn = 1, activePlayerCount = 0
    for (let i = 0; i < playerCount; i++) {
      if (rec.foldPlayerIndex.includes(i)) {
        foldCount ++
      }
      else if (!rec.allinPlayerIndexs.includes(i)) {
        allAllIn = 0
        activePlayerCount ++
      }
    }
    if (foldCount >= playerCount - 1 || allAllIn === 1) {
      rec.currentTurn = 'end'
      return rec
    }
    
    while (rec.foldPlayerIndex.includes(curIndex) ||
      rec.allinPlayerIndexs.includes(curIndex)) {
      curIndex = (curIndex + 1) % playerCount
    }
    
    while (rec.foldPlayerIndex.includes(lastRaisePlayerNextIndex) ||
      rec.allinPlayerIndexs.includes(lastRaisePlayerNextIndex)) {
        lastRaisePlayerNextIndex = (lastRaisePlayerNextIndex + 1) % playerCount
    }

    if (curIndex === rec.lastRaisePlayerIndex || 
      (curIndex === lastRaisePlayerNextIndex && 
       rec.playerTurnBets[rec.playerIndices[curIndex]] === rec.lastRaiseBet) && 
       rec.allinPlayerIndexs.includes(rec.lastRaisePlayerIndex)
    ) {

      console.log('entered')

      // 只剩一人能做选择时，游戏结束
      if (activePlayerCount === 1) {
        rec.currentTurn = 'end'
        return rec
      }

      if (rec.currentTurn === 'river') {
        rec.currentTurn = 'end'
        return rec
      }
      else if (rec.currentTurn === 'preflop') {
        rec.currentTurn = 'flop'
      }
      else if (rec.currentTurn === 'flop') {
        rec.currentTurn = 'turn'
      }
      else if (rec.currentTurn === 'turn') {
        rec.currentTurn = 'river' 
      }

      curIndex = rec.smallBlidPlayerIndex
      while (rec.foldPlayerIndex.includes(curIndex) ||
        rec.allinPlayerIndexs.includes(curIndex))
        curIndex = (curIndex + 1) % playerCount

      rec.currentPlayerIndex = curIndex
      rec.lastRaisePlayerIndex = curIndex
      rec.lastRaiseBet = 0
      for (var i = 0; i < playerCount; i++)
        rec.playerTurnBets[i] = 0

      return rec
    }
    else {
        
      rec.currentPlayerIndex = curIndex

      return rec
    }
  }

  // 结算游戏
  async function gamePlayingRecEnd(rec : TexasGamePlayingRecord, session) {
    let {channelId, guildId} = session
    // 首先获取每个存活玩家的最大牌组
    let playerHandTypes : string[] = [],
      winningPlayerIndex : number[] = [],
      playerResult : number[] = []
      
    let searchResult = await ctx.database.get('texas_game_room_record', {channelId, guildId})

    assert(searchResult.length > 0)

    let gameRoom : TexasGameRoomRecord = searchResult[0]

    let playerCount = rec.playerUserIds.length, activePlayerCount = 0

    let playerCard5 : Card5[] = []

    let playerResultFlag : boolean[] = [], winningFlag : boolean = true

    for (var i = 0; i < playerCount; i++) {
      let realIndex = rec.playerIndices[i]

      playerCard5[realIndex] = getMaxCard5(rec.deckTable, 
        [rec.playerHands[realIndex], rec.playerHands[realIndex+playerCount]])

      switch(playerCard5[realIndex].cardType) {
        case CardType.RoyalFlush: playerHandTypes[realIndex] = '皇家同花顺'; break
        case CardType.StraightFlush: playerHandTypes[realIndex] = '同花顺'; break
        case CardType.FourOfOne: playerHandTypes[realIndex] = '四条'; break
        case CardType.FullHouse: playerHandTypes[realIndex] = '葫芦'; break
        case CardType.Flush: playerHandTypes[realIndex] = '同花'; break
        case CardType.Straight: playerHandTypes[realIndex] = '顺子'; break
        case CardType.ThreeOfOne: playerHandTypes[realIndex] = '三条'; break
        case CardType.TwoPair: playerHandTypes[realIndex] = '两对'; break
        case CardType.Pair: playerHandTypes[realIndex] = '对子'; break
        case CardType.HighCard: playerHandTypes[realIndex] = '高牌'; break
      }

      //console.log(`${JSON.stringify(playerCard5[realIndex])}`)

      if (!rec.foldPlayerIndex.includes(i)) {
        activePlayerCount ++
        playerResultFlag[realIndex] = false
      }
      else  {
        playerResultFlag[realIndex] = true
      }

      playerResult[realIndex] = -rec.playerBets[realIndex]
    }

    while(activePlayerCount > 0) {

      let maxCard5 : Card5 = {
        cardType : -1,
        cardNums : [],
        cards : [],
        cmpNums : []
      }

      let maxIndices = []

      // 获取牌型最大的一批人（可能有多个），若有all-in的人，则按平分筹码分
      for (var i = 0; i < playerCount; i++) {
        let realIndex = rec.playerIndices[i]
        if (playerResultFlag[realIndex] === false) {
          if (cmpCard5 (maxCard5, playerCard5[realIndex]) < 0) {
            maxCard5 = {...playerCard5[realIndex]}
          }
        }
      }
      for (var i = 0; i < playerCount; i++) { 
        let realIndex = rec.playerIndices[i]
        if (playerResultFlag[realIndex] === false) {
          if (cmpCard5 (maxCard5, playerCard5[realIndex]) === 0) {
            maxIndices.push(i)

          }
        }
      }

      for (var i = 0; i < playerCount; i++) {
        let realIndex = rec.playerIndices[i]
        console.log(`${i+1}, [${playerCard5[realIndex].cards.toString()}], [${playerCard5[realIndex].cmpNums.toString()}]`)
      }

      if (winningFlag) {
        winningFlag = false
        winningPlayerIndex = maxIndices
      }

      console.log(maxIndices.toString())

      let len = maxIndices.length
      for (var i = 0; i < len; i++) {

        // 按平分比例分配，但all-in玩家所得不超过其所下的注
        let proportion = len - i, index = -1

        // 获取all-in（若有）筹码最小玩家
        for (var j = 0; j < len; j++) {
          let realIndex = rec.playerIndices[maxIndices[j]]
          if (playerResultFlag[realIndex] === false) {
            if (index === -1) {
              index = maxIndices[j]
              continue
            }
            let index1 = index, index2 = maxIndices[j]
            let realIndex1 = rec.playerIndices[index1], realIndex2 = rec.playerIndices[index2]
            if (rec.allinPlayerIndexs.includes(index1)) {
              if (rec.allinPlayerIndexs.includes(index2)) {
                index = rec.playerBets[realIndex1] < rec.playerBets[realIndex2] ? 
                  index1 : index2 
              }
            }
            else {
              if (rec.allinPlayerIndexs.includes(index2)) {
                index = index2
              }
            }
          }
        }

        let earnPlayer = rec.playerIndices[index]

        // 分配牌较小/fold的玩家的筹码
        for (var j = 0; j < playerCount; j++) {
          let realIndex = rec.playerIndices[j]

          // 同级别的人不会发生筹码交换，只对不同级别的人做判断，此时高级别的已经拿完自己的赌注
          if (!maxIndices.includes(j)) {
            let earn = Math.ceil(rec.playerBets[realIndex] / proportion)

            // 这个人all-in了
            if (rec.allinPlayerIndexs.includes(earnPlayer) && earn > rec.playerBets[earnPlayer]) {
              rec.playerBets[realIndex] -= rec.playerBets[earnPlayer]
              playerResult[earnPlayer] += rec.playerBets[earnPlayer]
            }
            else {
              rec.playerBets[realIndex] -= earn
              playerResult[earnPlayer] += earn
            }
          }
        }
        // 拿走自己的筹码
        playerResult[earnPlayer] += rec.playerBets[earnPlayer]
        rec.playerBets[earnPlayer] = 0
        playerResultFlag[earnPlayer] = true

        console.log(`curPlayer: ${earnPlayer}, curRes: ${playerResult.toString()}`)
      }

      activePlayerCount -= len
    }

    // 若还有未分完筹码，其余人拿走自己剩下的筹码
    for (var i = 0; i < playerCount; i++) {
      playerResult[i] += rec.playerBets[i]
      rec.playerBets[i] = 0
    }

    // 分配筹码后，将数据更新到房间数据
    for (var i = 0; i < playerCount; i++) {
      let realIndex = rec.playerIndices[i]
      gameRoom.playerStakes[realIndex] += playerResult[realIndex]
    }

    await ctx.database.set('texas_game_room_record', {channelId, guildId}, {
      playerStakes : gameRoom.playerStakes,
      gameState : 'waiting',
      buttonPlayerIndex : (gameRoom.buttonPlayerIndex + 1) % playerCount
    })

    await ctx.database.create('texas_game_history', {
      gameTime : rec.gameTime,
      channelId,
      guildId,
      playerIndices : rec.playerIndices,
      deckTable : rec.deckTable,
      playerUserIds : rec.playerUserIds,
      playerUserNames : rec.playerUserNames,
      playerHands : rec.playerHands,
      playerHandTypes,
      playerStakes : rec.playerStakes,
      playerResult,
      buttonPlayerIndex : rec.buttonPlayerIndex,
      winningPlayerIndex
    })

    await ctx.database.remove('texas_game_playing_record', {channelId, guildId})

    // for (var i = 0; i < playerCount; i++) {
    //   await ctx.database.remove('texas_user_map', {playerUserId : rec.playerUserIds[i]})
    // }

    let searchHistory = await ctx.database.get('texas_game_history', {channelId, guildId, gameTime : rec.gameTime})

    await session.sendQueued(gamePlayingHistoryToString(searchHistory[0]), 1.0)

    // 删除一些记录
    searchHistory = await ctx.database.get('texas_game_history', {channelId, guildId})
    searchHistory.sort((a, b) => b.gameTime - a.gameTime)
    ctx.database.remove('texas_game_history', {
      channelId,
      guildId,
      gameTime : {$lte : searchHistory[maxGameHistoryCount].gameTime}
    })

    return
  }

  // 获取给的5张牌的信息，记录在类中
  function getCard5Info(cards : Card5) {
    
    assert (cards.cards.length === 5 && cards.cmpNums.length === 0)

    for (var i = 0; i < 5; i++) {
      if (cards.cards[i].length === 4)
        cards.cardNums[i] = 10
      else 
      {
        switch (cards.cards[i][2]) {
          case 'A' : cards.cardNums[i] = 14 
          break;
          case 'J' : cards.cardNums[i] = 11
          break;
          case 'Q' : cards.cardNums[i] = 12
          break;
          case 'K' : cards.cardNums[i] = 13
          break;
          default : cards.cardNums[i] = Number(cards.cards[i][2])
        }
      }
    }

    var is_flush = false, is_striaght = false, is_A_straight = false

    var fourKind = -1, threeKind = -1, twoKind1 = -1, twoKind2 = -1

    // 是同花
    if (cards.cards[0][0] === cards.cards[1][0] && 
      cards.cards[1][0] === cards.cards[2][0] && 
      cards.cards[2][0] === cards.cards[3][0] && 
      cards.cards[3][0] === cards.cards[4][0]
    ) {
      is_flush = true
    }

    // 卡牌点数从大到小排序
    cards.cardNums.sort((a, b) => b - a)
    // 是顺子
    if ((cards.cardNums[0]-1 === cards.cardNums[1] || cards.cardNums[0] === 14 && cards.cardNums[4] === 2) && 
      cards.cardNums[1]-1 === cards.cardNums[2] && 
      cards.cardNums[2]-1 === cards.cardNums[3] && 
      cards.cardNums[3]-1 === cards.cardNums[4]
    ) {
      // A结束的顺子
      if (cards.cardNums[0] === 14 && cards.cardNums[1] === 13) {
        cards.cmpNums.push(14)
        is_A_straight = true
      }
      else if (cards.cardNums[0] === 14 && cards.cardNums[1] === 5)
      {
        cards.cmpNums.push(5)
      }
      else 
      {
        cards.cmpNums.push(cards.cardNums[0])
      }
      is_striaght = true
    }

    var cardsToCount : number[] = []

    for (var i = 0; i < 5; i++) {
      if (!cardsToCount.includes(cards.cardNums[i]))
        cardsToCount.push(cards.cardNums[i])
    }

    for (var i = 0; i < cardsToCount.length; i++) {
      let cnt = 0
      for (var j = 0; j < 5; j++) {
        if (cards.cardNums[j] === cardsToCount[i])
          cnt ++
      }
      switch (cnt) {
        case 4: 
          fourKind = cardsToCount[i]
        break
        case 3:
          threeKind = cardsToCount[i]
        break
        case 2:
          if (twoKind1 >= 0) {
            twoKind2 = cardsToCount[i]
          }
          else {
            twoKind1 = cardsToCount[i]
          }
        break
      }
    }

    if (is_flush) {
      if (is_A_straight) {
        cards.cardType = CardType.RoyalFlush
      }
      else if (is_striaght) {
        cards.cardType = CardType.StraightFlush
      }
      else {
        cards.cardType = CardType.Flush
        cards.cmpNums = cards.cardNums
      }
    }
    else if (is_striaght) {
      cards.cardType = CardType.Straight
    }
    else if (fourKind >= 0) {
      cards.cardType = CardType.FourOfOne
      cards.cmpNums.push(fourKind)
      for (var i = 0; i < 5; i++)
        if (cards.cardNums[i] != fourKind)
          cards.cmpNums.push(cards.cardNums[i])
    }
    else if (threeKind >= 0 && twoKind1 >= 0) {
      cards.cardType = CardType.FullHouse
      cards.cmpNums.push(threeKind)
      cards.cmpNums.push(twoKind1)
    }
    else if (threeKind >= 0) {
      cards.cardType = CardType.ThreeOfOne
      cards.cmpNums.push(threeKind)
      for (var i = 0; i < 5; i++)
        if (cards.cardNums[i] != threeKind)
          cards.cmpNums.push(cards.cardNums[i])
    }
    else if (twoKind1 >= 0 && twoKind2 >= 0) {
      cards.cardType = CardType.TwoPair
      cards.cmpNums.push(twoKind1)
      cards.cmpNums.push(twoKind2)
      for (var i = 0; i < 5; i++)
        if (cards.cardNums[i] != twoKind1 && cards.cardNums[i] != twoKind2)
          cards.cmpNums.push(cards.cardNums[i])
    }
    else if (twoKind1 >= 0) {
      cards.cardType = CardType.Pair
      cards.cmpNums.push(twoKind1)
      for (var i = 0; i < 5; i++)
        if (cards.cardNums[i] != twoKind1)
          cards.cmpNums.push(cards.cardNums[i])
    }
    else {
      cards.cardType = CardType.HighCard
      cards.cmpNums = cards.cardNums
    }
  }

  // 比较两手牌的大小
  function cmpCard5(cards1:Card5, cards2:Card5) : number {
    if (cards1.cardType != cards2.cardType) {
      return cards1.cardType - cards2.cardType
    }
    else {
      assert(cards1.cmpNums.length === cards2.cmpNums.length)

      for (var i = 0; i < cards1.cmpNums.length; i++) {
        if (cards1.cmpNums[i] != cards2.cmpNums[i])
          return cards1.cmpNums[i] - cards2.cmpNums[i]
      }
      return 0
    } 
  }

  // 由桌面牌和手牌获取最大的组合
  function getMaxCard5(table : string[], hand : string[]) : Card5 {
    let arr = []
    let ret : Card5, tmp : Card5

    assert(table.length == 5 && hand.length == 2)

    //console.log(`${table.toString()} | ${hand.toString()}`)

    // 选3张
    for (var i = 0; i < 5; i++) {
      for (var j = i+1; j < 5; j++) {
        for (var k = j+1; k < 5; k++) {
          arr = [table[i], table[j], table[k], hand[0], hand[1]]
          if (i === 0 && j === 1 && k === 2) {
            ret = {
              cards : arr.slice(), 
              cardNums : [],
              cmpNums : [],
              cardType : -1
            }
            getCard5Info(ret)
          }
          else {
            tmp = {
              cards : arr.slice(), 
              cardNums : [],
              cardType : -1, 
              cmpNums : []
            }
            getCard5Info(tmp)
            if (cmpCard5(ret, tmp) < 0) {
              ret = {...tmp}
            }
          }
        }
      }
    }

    // 选4张
    for (var i = 0; i < 5; i++) {
      for (var j = i+1; j < 5; j++) {
        for (var k = j+1; k < 5; k++) {
          for (var l = k+1; l < 5; l++) {
            arr = [table[i], table[j], table[k], table[l], hand[0]]
            tmp = {
              cards : arr.slice(), 
              cardNums : [],
              cardType : -1, 
              cmpNums : []
            }
            getCard5Info(tmp)

            if (cmpCard5(ret, tmp) < 0) {
              ret = {...tmp}
            }

            arr = [table[i], table[j], table[k], table[l], hand[1]]
            tmp = {
              cards : arr.slice(), 
              cardNums : [],
              cardType : -1, 
              cmpNums : []
            }
            getCard5Info(tmp)
            
            if (cmpCard5(ret, tmp) < 0) {
              ret = {...tmp}
            }
          }
        }
      }
    }

    if (enableAllTableCards) {
      tmp = {
        cards : table.slice(),
        cardNums : [],
        cardType : -1, 
        cmpNums : []
      }

      if (cmpCard5(ret, tmp) > 0) {
        ret = {...tmp}
      }
    }

    return ret
  }
}

