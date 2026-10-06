import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "zh";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translateBetValue: (value: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App Branding & Header
    "app.title": "VANTAGE ROYALE",
    "app.subtitle": "Strategic Simulator",
    "app.activeSessions": "{count} ACTIVE SESSIONS",
    "app.allocationUnits": "Allocation Units",
    "app.units": "PT",
    "app.managerConsole": "Manager Console",
    "app.exitConsole": "Exit Console",
    "app.signOut": "Sign Out",
    "app.lang": "Language",

    // Auth screen
    "auth.title": "VANTAGE ROYALE",
    "auth.subtitle": "Corporate Strategy Simulator",
    "auth.button": "Initiate Authentication",
    "auth.notice": "Secure Multi-User Environment • Virtual Units Only",

    // Participant Registration
    "register.title": "Study Participant Registration",
    "register.subtitle": "Every player must name themselves first. Each name can only be used once for accurate data recording.",
    "register.inputLabel": "Participant Name / Subject ID",
    "register.placeholder": "e.g. Subject_01, Participant_A...",
    "register.submit": "Confirm & Enter Simulation",
    "register.verifying": "Verifying uniqueness...",
    "register.nameAvailable": "Name is unique & available",
    "register.nameTaken": "This name has already been registered. Every name can only be used once.",
    "register.nameTooShort": "Name must be at least 2 characters.",
    "register.networkError": "Network connection error. Please try again.",
    "register.existingRecordFound": "Existing Player Record Found",
    "register.resumeSession": "Resume Session (Keep My Data)",
    "register.sessionConcluded": "This participant has already left the game and concluded their session. Once you leave the game, you cannot log in again.",
    "register.sessionConcludedBadge": "Left Game (Cannot Log In Again)",
    "register.currentParticipant": "Participant",
    "register.changeParticipant": "Change",
    "register.isManagerPrompt": "Manager ID detected. Please enter manager password:",
    "register.managerPassPlaceholder": "Enter manager password",

    // Manager Identification & Test Mode
    "manager.loginTitle": "Manager / Researcher Login",
    "manager.loginDesc": "Sign in with Manager ID 'manager' to test game mechanics and inspect participant data.",
    "manager.idLabel": "Manager ID",
    "manager.idHint": "ID: manager",
    "manager.passwordLabel": "Manager Password",
    "manager.passwordPlaceholder": "Enter manager password",
    "manager.loginBtn": "Authenticate as Manager",
    "manager.testModeBadge": "Manager Test Mode",
    "manager.testModeNotice": "Your wagers are flagged as test data and WILL NOT affect the study dataset.",
    "manager.switchToParticipant": "Switch to Participant Mode",
    "manager.switchToManager": "Manager Login (ID: manager)",
    "manager.wrongPassword": "Incorrect manager password. Please try again.",
    "manager.organizedDataTitle": "Organized Participant Study Data",
    "manager.studyOnlyStats": "Study Data Only (Clean)",
    "manager.totalParticipants": "Total Participants",
    "manager.totalStudyTrials": "Total Study Trials",
    "manager.studyWagered": "Study Wagered",
    "manager.redGreenRatio": "Red vs Black Ratio",
    "manager.redBlackRatio": "Red vs Black Ratio",
    "manager.testSpinsCount": "Manager Test Spins",
    "manager.testSpinsDesc": "Kept separate from study data",
    "manager.exportClean": "Export Clean Study Data (CSV)",
    "manager.exportAll": "Export All (With Test Flag)",
    "manager.viewTrials": "View Trials ({count})",
    "manager.closeTrials": "Close Logs",
    "manager.trialDetails": "Trial Records for {name}",
    "manager.noTrials": "No recorded trials yet for this participant.",
    "manager.trialNum": "Trial #",
    "manager.target": "Target",
    "manager.outcome": "Outcome",
    "manager.payout": "Payout",
    "manager.balance": "Balance",
    "manager.netPnL": "Net P&L",
    "manager.winRate": "Win Rate",
    "manager.backToTest": "Back to Test Roulette",
    "manager.paramXTitle": "Initial Fair Bets (Parameter X)",
    "manager.paramXDesc": "Number of initial rounds with 50% fair probability before unfair house edge applies.",
    "manager.conditionBalanceTitle": "Condition X Participant Distribution (Balanced & Averaged)",
    "manager.conditionBalanceDesc": "Participants are automatically balanced across conditions X=[0, 5, 10, 15] so the number of players of each X is averaged.",
    "manager.averagePerCondition": "Average / Condition",
    "manager.playersCount": "{count} players",
    "manager.balancedStatus": "Balanced & Averaged Allocation Active",
    "manager.nextAssignedCondition": "Next Participant Assigned",
    "manager.rebalanceBtn": "Rebalance All Players Evenly",
    "manager.rebalanceSuccess": "All participants balanced across conditions X=[0, 5, 10, 15]!",
    "manager.playerRecordsTab": "Player Records & Trials Ledger",
    "manager.analyticsTab": "Statistical Analysis Suite",
    "manager.allTrialsMasterTable": "Master Records Table",
    "manager.exportAllRawCsv": "Export All Records (CSV)",
    "manager.recordCount": "{count} Total Records Recorded",
    "manager.roundNum": "Round #",
    "manager.playerName": "Participant Name",
    "manager.groupedByX": "Grouped by Condition X",
    "manager.byParticipant": "By Participant",
    "manager.exportGroupedByX": "Export Grouped by X (CSV)",
    "manager.exportConditionX": "Export X={x} (CSV)",
    "manager.condition": "Condition",
    "manager.whatBetOn": "Bet Selection",
    "manager.howMuchBet": "Bet Amount",
    "manager.roundResult": "Round Result",
    "manager.allConditions": "All Conditions",
    "manager.filterByCondition": "Filter Condition",
    "manager.roundsInCondition": "{count} Rounds in Condition X={x}",
    "manager.primaryCondition": "Condition X={x}",
    "manager.netProfitLoss": "Net P&L",

    // Protocol card
    "protocol.title": "Study Rules & Guidelines",
    "protocol.tapToView": "(Tap to view)",
    "protocol.hide": "(Hide)",
    "protocol.step1": "01. Unlimited Rounds: There is NO limit on the number of rounds.",
    "protocol.step2": "02. Game Over Condition: The game is over when you lose all your points (balance reaches 0).",
    "protocol.step3": "03. Freedom to Leave: You can conclude your session and leave at any time.",
    "protocol.step4": "04. Study Restriction: Only 'Red' & 'Black' allocations are available.",

    // Game Over & Leave
    "gameover.title": "Session Concluded (Game Over)",
    "gameover.desc": "You have lost all your points (balance reached 0). Your experiment run is complete and cannot be continued.",
    "gameover.thankyou": "Thank you for participating in our study on probabilistic decision making. Your records have been archived.",
    "gameover.leaveBtn": "Finalize & Exit Game",
    "gameover.participantId": "Participant ID",
    "gameover.roundsPlayed": "Rounds Played",
    "gameover.endingBalance": "Ending Balance",
    "app.leaveAnytime": "Leave Game",
    "app.leaveAnytimeTooltip": "Conclude your trial session. Once you leave, you cannot continue the game.",
    "app.confirmLeaveTitle": "Conclude & Leave Game?",
    "app.confirmLeaveDesc": "All your participant data has been recorded. Once you leave the game, you will NOT be able to log in again. Are you sure you want to leave?",
    "app.confirmLeaveConfirm": "Yes, Leave Game",
    "app.confirmLeaveCancel": "Keep Playing",

    // Study Banner & Controls
    "study.bannerTitle": "Research Study Active",
    "study.bannerDesc": "Single betting method opened: 'Red' and 'Black' only.",
    "board.chooseAllocation": "Select Allocation Target",
    "board.redTitle": "RED",
    "board.blackTitle": "BLACK",
    "board.greenTitle": "GREEN",
    "board.redOdds": "1:1 Payout • 18 Red Numbers (47.4%)",
    "board.blackOdds": "1:1 Payout • 18 Black Numbers (47.4%)",
    "board.greenOdds": "17:1 Payout • 0 & 00 Slots (5.3%)",
    "board.chipSelect": "Chip Value",
    "board.allocated": "Allocated",
    "board.clickToBet": "Click to add {amount} PT",
    "board.redDetail": "Numbers 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36",
    "board.blackDetail": "Numbers 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35",
    "board.greenDetail": "Special Zero Slots: 0 and 00",
    "board.otherLocked": "All other betting methods (Numbers, Green zeros 0/00, Dozens, Columns, etc.) are locked for this research study.",

    // History card
    "history.title": "Sim History",
    "history.empty": "No historical data recorded",

    // Outcome probe
    "probe.title": "Outcome Probe",
    "probe.idle": "IDLE",
    "probe.vector": "{color} vector",
    "probe.spin": "Initiate Simulation",
    "probe.spinning": "Simulating...",
    "probe.reset": "Reset Allocation",

    // Live Activity
    "activity.title": "Live Activity",
    "activity.globalOutcomes": "Global Outcomes",
    "activity.awaiting": "Awaiting network signals... Shared activity will appear here.",
    "activity.placed": "placed {amount} on {value}",
    "activity.toggleTab": "Live Feed",

    // Leaderboard / Ranking
    "leaderboard.title": "TOP 3 Leaderboard",
    "leaderboard.subtitle": "Ranked strictly by the final PT players have",
    "leaderboard.finalPt": "Final PT",
    "leaderboard.finalStatus": "Final",
    "leaderboard.activeStatus": "Active",
    "leaderboard.empty": "No participant ranking recorded yet",
    "leaderboard.rank": "Rank",
    "leaderboard.player": "Participant",
    "leaderboard.units": "Units (PT)",
    "leaderboard.trials": "{count} trials",
    "leaderboard.you": "YOU",
    "leaderboard.live": "LIVE",
    "leaderboard.openSlot": "Awaiting...",
    "leaderboard.toggleTab": "🏆 Top 3 Ranking",

    // Manager Console
    "manager.title": "Managerial Console",
    "manager.totalPlayers": "Total Players",
    "manager.loggedBets": "Logged Bets",
    "manager.liveData": "Live Simulation Data",
    "manager.activeAnalytics": "Active Analytics",
    "manager.lastActive": "Last active",
    "manager.awaiting": "Awaiting session data...",
    "manager.loading": "Loading analytics...",
    "manager.insight": "Real-time analysis indicates balanced outcome distributions. System risk tolerance monitored via Operational Point flow.",
    "manager.exportCsv": "Export Study Data (CSV)",
    "manager.participantName": "Participant",

    // Footer
    "footer.sessionId": "Session ID: {id}",
    "footer.systemStatus": "System Status: Nominal",
    "footer.secureNotice": "System Secure - Educational Operational Point Simulator",

    // Colors
    "color.red": "red",
    "color.black": "black",
    "color.green": "green",

    // Board labels
    "board.first12": "1st 12",
    "board.second12": "2nd 12",
    "board.third12": "3rd 12",
    "board.twoToOne": "2 TO 1",
    "board.low": "1-18",
    "board.even": "EVEN",
    "board.red": "RED",
    "board.black": "BLACK",
    "board.odd": "ODD",
    "board.high": "19-36",
  },
  zh: {
    // App Branding & Header
    "app.title": "VANTAGE 皇家轮盘",
    "app.subtitle": "策略模拟系统",
    "app.activeSessions": "{count} 个活跃连接",
    "app.allocationUnits": "可用筹码积分",
    "app.units": "积分",
    "app.managerConsole": "管理员控制台",
    "app.exitConsole": "退出控制台",
    "app.signOut": "退出登录",
    "app.lang": "语言",

    // Auth screen
    "auth.title": "VANTAGE 皇家轮盘",
    "auth.subtitle": "企业级轮盘策略模拟系统",
    "auth.button": "开始身份验证",
    "auth.notice": "安全多人在线环境 • 仅限虚拟演示积分",

    // Participant Registration
    "register.title": "实验被试身份登记",
    "register.subtitle": "每位被试在开始前必须先登记姓名/编号，且每个名称仅可使用一次，以便准确记录实验数据。",
    "register.inputLabel": "被试姓名 / 编号 ID",
    "register.placeholder": "例如：被试01、Subject_A...",
    "register.submit": "确认登记并进入模拟",
    "register.verifying": "正在核验名称唯一性...",
    "register.nameAvailable": "此名称唯一可用",
    "register.nameTaken": "该名称已被其他被试登记使用。每个名称仅能使用一次。",
    "register.nameTooShort": "名称长度至少需2个字符。",
    "register.networkError": "网络连接异常，请重试。",
    "register.existingRecordFound": "已找到该被试的历史档案",
    "register.resumeSession": "恢复上次会话（保留我的实验数据）",
    "register.sessionConcluded": "该被试已离开游戏并完成会话。玩家一旦离开游戏，将无法再次登录。",
    "register.sessionConcludedBadge": "已离开游戏 (无法再次登录)",
    "register.currentParticipant": "当前被试",
    "register.changeParticipant": "更换",
    "register.isManagerPrompt": "已检测到管理员账号。请输入管理员密码：",
    "register.managerPassPlaceholder": "请输入管理员密码",

    // Manager Identification & Test Mode
    "manager.loginTitle": "管理者 / 研究员登录",
    "manager.loginDesc": "使用管理者账号 'manager' 登录，测试轮盘机制并查阅各被试整理后的实验数据。",
    "manager.idLabel": "管理者账号",
    "manager.idHint": "账号: manager",
    "manager.passwordLabel": "管理者密码",
    "manager.passwordPlaceholder": "请输入管理者密码",
    "manager.loginBtn": "验证并以管理者身份进入",
    "manager.testModeBadge": "管理者测试模式",
    "manager.testModeNotice": "当前处于测试模式，您的下注为测试数据，绝不会影响或污染实验研究数据。",
    "manager.switchToParticipant": "切换为普通被试模式",
    "manager.switchToManager": "管理者入口 (账号: manager)",
    "manager.wrongPassword": "管理者密码错误，请重新输入。",
    "manager.organizedDataTitle": "整理后的各被试实验数据",
    "manager.studyOnlyStats": "仅包含正式实验数据（纯净）",
    "manager.totalParticipants": "正式被试总数",
    "manager.totalStudyTrials": "正式注单总数",
    "manager.studyWagered": "实验总下注额",
    "manager.redGreenRatio": "红/黑下注偏好比",
    "manager.redBlackRatio": "红/黑下注偏好比",
    "manager.testSpinsCount": "管理者测试轮次",
    "manager.testSpinsDesc": "与正式实验数据严格隔离",
    "manager.exportClean": "导出纯净实验数据 (CSV)",
    "manager.exportAll": "导出全部数据 (含测试标记)",
    "manager.viewTrials": "查看明细 ({count})",
    "manager.closeTrials": "收起明细",
    "manager.trialDetails": "被试 {name} 的详细下注记录",
    "manager.noTrials": "该被试暂无已记录的下注试验。",
    "manager.trialNum": "轮次",
    "manager.target": "下注目标",
    "manager.outcome": "开奖结果",
    "manager.payout": "派彩",
    "manager.balance": "结余积分",
    "manager.netPnL": "净损益",
    "manager.winRate": "胜率",
    "manager.backToTest": "返回轮盘测试",
    "manager.paramXTitle": "初始对称公平轮数 (参数 X)",
    "manager.paramXDesc": "在引入赌场非对称劣势前，赋予被试 50% 严格对称公平胜率的初始轮次。",
    "manager.conditionBalanceTitle": "条件 X 被试数量分配 (平均分布)",
    "manager.conditionBalanceDesc": "系统自动均衡分配，确保每个 X 条件（0, 5, 10, 15）的被试玩家数量严格平均一致。",
    "manager.averagePerCondition": "每组平均人数",
    "manager.playersCount": "{count} 人",
    "manager.balancedStatus": "均等平衡分配生效中",
    "manager.nextAssignedCondition": "下一位被试将分配至",
    "manager.rebalanceBtn": "均等重新平衡各组",
    "manager.rebalanceSuccess": "已成功均等重排各组玩家条件！",
    "manager.playerRecordsTab": "被试数据明细记录 (免分析)",
    "manager.analyticsTab": "统计分析图表",
    "manager.allTrialsMasterTable": "全部被试总明细表",
    "manager.exportAllRawCsv": "导出全部记录 (CSV)",
    "manager.recordCount": "共记录 {count} 条完整注单",
    "manager.roundNum": "轮次",
    "manager.playerName": "被试姓名",
    "manager.groupedByX": "按实验条件 X 分组",
    "manager.byParticipant": "按各被试查看",
    "manager.exportGroupedByX": "导出按 X 分组明细 (CSV)",
    "manager.exportConditionX": "导出 X={x} 数据 (CSV)",
    "manager.condition": "条件",
    "manager.whatBetOn": "下注目标",
    "manager.howMuchBet": "下注金额",
    "manager.roundResult": "开奖结果",
    "manager.allConditions": "全部条件",
    "manager.filterByCondition": "筛选条件",
    "manager.roundsInCondition": "条件 X={x} 下的 {count} 轮记录",
    "manager.primaryCondition": "条件 X={x}",
    "manager.netProfitLoss": "净损益",

    // Protocol card
    "protocol.title": "实验规则与须知",
    "protocol.tapToView": "(点击查看)",
    "protocol.hide": "(点击收起)",
    "protocol.step1": "01. 无轮数限制：本实验没有轮数上限，可自由持续下注。",
    "protocol.step2": "02. 游戏结束：当积分耗尽（积分降至0）时游戏即告结束。",
    "protocol.step3": "03. 随时退出：被试可在任何时刻主动选择结束并离开实验。",
    "protocol.step4": "04. 实验限定：本次研究仅对玩家开放「红」与「黑」下注。",

    // Game Over & Leave
    "gameover.title": "实验正式结束 (Game Over)",
    "gameover.desc": "您的所有积分已耗尽（积分归零）。本次实验阶段已正式封存结束，无法再次继续游戏。",
    "gameover.thankyou": "非常感谢您参与本项关于概率感知与决策偏倚的学术实验！您的数据已完整封存。",
    "gameover.leaveBtn": "确认封存并退出游戏",
    "gameover.participantId": "被试编号 ID",
    "gameover.roundsPlayed": "已完成轮数",
    "gameover.endingBalance": "最终结余积分",
    "app.leaveAnytime": "离开游戏",
    "app.leaveAnytimeTooltip": "离开游戏并结束实验。一旦离开，您将无法再次继续游戏。",
    "app.confirmLeaveTitle": "确认结束并离开游戏？",
    "app.confirmLeaveDesc": "您的所有实验数据均已完整记录。一旦离开游戏，您将无法再次登录本游戏。您确定要退出吗？",
    "app.confirmLeaveConfirm": "确认退出游戏",
    "app.confirmLeaveCancel": "继续留在游戏",

    // Study Banner & Controls
    "study.bannerTitle": "研究实验模式已启用",
    "study.bannerDesc": "本次研究仅对玩家开放一种下注方式：「红 (Red)」与「黑 (Black)」。",
    "board.chooseAllocation": "选择下注策略目标",
    "board.redTitle": "红 (RED)",
    "board.blackTitle": "黑 (BLACK)",
    "board.greenTitle": "绿 (GREEN)",
    "board.redOdds": "1赔1 • 包含18个红数 (47.4% 概率)",
    "board.blackOdds": "1赔1 • 包含18个黑数 (47.4% 概率)",
    "board.greenOdds": "1赔17 • 包含0与00 (5.3% 概率)",
    "board.chipSelect": "选择筹码面额",
    "board.allocated": "已下注",
    "board.clickToBet": "点击加注 {amount} 积分",
    "board.redDetail": "红数列表：1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36",
    "board.blackDetail": "黑数列表：2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35",
    "board.greenDetail": "特殊零号区：0 与 00",
    "board.otherLocked": "其余下注方式（单号、绿色零号区 0/00、前中后区、行列等）已在本研究中锁定停用。",

    // History card
    "history.title": "本局开奖历史",
    "history.empty": "暂无历史开奖记录",

    // Outcome probe
    "probe.title": "开奖测定仪",
    "probe.idle": "待开奖",
    "probe.vector": "{color} 区域",
    "probe.spin": "启动轮盘模拟",
    "probe.spinning": "旋转运算中...",
    "probe.reset": "清空当前下注",

    // Live Activity
    "activity.title": "全局实时动态",
    "activity.globalOutcomes": "全局开奖走势",
    "activity.awaiting": "等待网络信号... 共享玩家动态将显示在此处。",
    "activity.placed": "在 {value} 下注 {amount}",
    "activity.toggleTab": "实时动态",

    // Leaderboard / Ranking
    "leaderboard.title": "TOP 3 最终积分榜",
    "leaderboard.subtitle": "严格依据玩家结束或离开游戏时的最终 PT 积分排名",
    "leaderboard.finalPt": "最终积分",
    "leaderboard.finalStatus": "定局",
    "leaderboard.activeStatus": "进行中",
    "leaderboard.empty": "暂无被试积分排行记录",
    "leaderboard.rank": "排名",
    "leaderboard.player": "被试代号",
    "leaderboard.units": "最终积分 (PT)",
    "leaderboard.trials": "{count} 轮下注",
    "leaderboard.you": "您本人",
    "leaderboard.live": "实时",
    "leaderboard.openSlot": "虚位以待...",
    "leaderboard.toggleTab": "🏆 Top 3 排行榜",

    // Manager Console
    "manager.title": "管理者分析控制台",
    "manager.totalPlayers": "玩家总人数",
    "manager.loggedBets": "已记录注单",
    "manager.liveData": "实时玩家模拟数据",
    "manager.activeAnalytics": "实时分析指标",
    "manager.lastActive": "最后活跃",
    "manager.awaiting": "等待接收玩家会话数据...",
    "manager.loading": "正在加载分析数据...",
    "manager.insight": "实时分析表明数字分布趋于均衡。通过操作积分流动实时监控系统风险耐受度。",
    "manager.exportCsv": "导出实验数据 (CSV)",
    "manager.participantName": "被试姓名",

    // Footer
    "footer.sessionId": "会话 ID: {id}",
    "footer.systemStatus": "系统状态：正常运行",
    "footer.secureNotice": "系统受保护运行 - 仅供教学模拟与策略演示",

    // Colors
    "color.red": "红色",
    "color.black": "黑色",
    "color.green": "绿色",

    // Board labels
    "board.first12": "前12 (1-12)",
    "board.second12": "中12 (13-24)",
    "board.third12": "后12 (25-36)",
    "board.twoToOne": "1赔2",
    "board.low": "小 (1-18)",
    "board.even": "双数 (EVEN)",
    "board.red": "红 (RED)",
    "board.black": "黑 (BLACK)",
    "board.odd": "单数 (ODD)",
    "board.high": "大 (19-36)",
  }
};

const betValueTranslationsZh: Record<string, string> = {
  "Low": "小 (1-18)",
  "High": "大 (19-36)",
  "Even": "双数 (Even)",
  "Odd": "单数 (Odd)",
  "Red": "红 (Red)",
  "Green": "绿 (Green)",
  "Black": "黑 (Black)",
  "1st 12": "前12区 (1-12)",
  "2nd 12": "中12区 (13-24)",
  "3rd 12": "后12区 (25-36)",
  "Col 1": "第1列",
  "Col 2": "第2列",
  "Col 3": "第3列",
};

const LanguageContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  translateBetValue: (v) => v,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is English ("en")
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("vantage_language");
    return saved === "zh" ? "zh" : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("vantage_language", lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || translations["en"]?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      });
    }
    return text;
  };

  const translateBetValue = (value: string): string => {
    if (language === "zh" && betValueTranslationsZh[value]) {
      return betValueTranslationsZh[value];
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateBetValue }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
