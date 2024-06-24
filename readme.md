# koishi-plugin-texas

[![npm](https://img.shields.io/npm/v/koishi-plugin-texas?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-texas)

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

## 一些话

这是本人在 JavaScript语言与Web程序设计上做的大作业，仅由本人一人开发，且仅在discord平台上进行了测试。
本人代码能力稍弱，难免会有一些 bug，若发现了请及时反馈（最好带上机器人发送的消息截图）

对于一些要加入复杂功能的建议，本人可能没有时间完成，若要基于源码进行开发，不必特地联系本人，
毕竟这个repo使用的license是MIT。若有对代码的疑问，可以联系本人（如果过了很长一段时间可能作者都看不懂自己的代码了XD）
