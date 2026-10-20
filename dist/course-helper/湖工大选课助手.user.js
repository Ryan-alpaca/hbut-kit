// ==UserScript==
// @name         湖工大选课助手（美化 / 网课优先 / 批次区分 / 高亮跳转 / 自动降级提交）
// @namespace    local.hbut.coursehelper
// @version      4.1.0
// @description  选课页面辅助。默认收成右下角小圆钮。自动识别批次，美化表格（19列压到5列、两列排布、隐藏冗余表头），按 APP 优先级找学习通网课，加载失败自动重试，并在二次确认后提交选课。
// @author       Ryan-alpaca
// @updateURL    https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/course-helper/%E6%B9%96%E5%B7%A5%E5%A4%A7%E9%80%89%E8%AF%BE%E5%8A%A9%E6%89%8B.user.js
// @downloadURL  https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/course-helper/%E6%B9%96%E5%B7%A5%E5%A4%A7%E9%80%89%E8%AF%BE%E5%8A%A9%E6%89%8B.user.js
// @match        https://jwxt.hbut.edu.cn/frontend/views/student/xkPage/*
// @match        https://jwxt.hbut.edu.cn/admin/xsd/xkgl/*
// @match        https://jwxt.hbut.edu.cn/*
// @match        https://hbut.jw.chaoxing.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ============================================================
   *  配置区
   * ============================================================ */

  // 公选课批次的网课清单（课程名 -> APP + 分类），已按 APP 优先级排序
  const ONLINE_XK = [
  {
    "name": "教育学",
    "app": "学习通",
    "cat": "绿色工业类",
    "pri": 1,
    "pin": 0
  },
  {
    "name": "《三国志》导读",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "《共产党宣言》导读",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "丝绸之路上的民族",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中华传统思想：对话先秦哲学",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中国古典哲学名著选读",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中国古典小说巅峰：四大名著鉴赏",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中国城市建设史",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "人力资源招聘与选拔",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "人类遗产与文明互鉴",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "传统文化与现代经营管理",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "儒学复兴与当代启蒙",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "先秦诸子导读",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "公共关系礼仪实务",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "公文写作规范",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "内部控制与风险管理",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "哲学基础",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "大国崛起：中国对外贸易概论",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "推开经济学之门",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "文化遗产与自然遗产",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "易学与中国传统文化",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "有效沟通技巧",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "江南史",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "沟通的艺术",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "知识论导论：我们能知道什么？",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "礼行天下 仪见倾心",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "组织行为与领导力",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "组织行为学",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "经济决策思维与原理",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "许子东重读鲁迅",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "领导力素养",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "马克思主义的时代解读",
    "app": "学习通",
    "cat": "人文情怀类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "创意思维",
    "app": "学习通",
    "cat": "创新创业类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "人工智能与法律",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "人工智能时代的创新思维",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "大数据与人工智能营销",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "大语言模型应用与实践",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "数据时代的推断陷阱",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "无人驾驶车辆",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "鸿蒙系统应用开发基础知识",
    "app": "学习通",
    "cat": "数智素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "TRIZ创新方法",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "TRIZ实践与应用",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "家庭安全合理用药",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "急救与心理技能",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "批创思维导论",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "批判与创意思考",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "整合思维",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "生命安全与救援",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "突发事件及自救互救",
    "app": "学习通",
    "cat": "科学素养类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中国戏曲文化",
    "app": "学习通",
    "cat": "艺术美育类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "中国陶瓷鉴赏与器物陈设",
    "app": "学习通",
    "cat": "艺术美育类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "建筑·文化·生活",
    "app": "学习通",
    "cat": "艺术美育类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "戏曲鉴赏",
    "app": "学习通",
    "cat": "艺术美育类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "群芳谱：《红楼梦》中的女性形象鉴赏",
    "app": "学习通",
    "cat": "艺术美育类",
    "pri": 1,
    "pin": 1
  },
  {
    "name": "《资治通鉴》导读",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "创业管理——易学实用的创业真知",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "创业：道与术",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "商学导论：10节课带你走进商业世界",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "大国兵器",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "潜艇海战风云录",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "管理素质与能力的五项修炼——跟我学“管理学”",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "职业探索与选择",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "自我塑造：成功五要素",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "英语演讲技巧与实训",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "营销：人人都需要的一门课",
    "app": "长江雨课堂",
    "cat": "人文情怀类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "应对气候变化的中国视角",
    "app": "长江雨课堂",
    "cat": "国际视野类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "互联网创新与创业",
    "app": "长江雨课堂",
    "cat": "科学素养类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "财务分析与决策",
    "app": "长江雨课堂",
    "cat": "科学素养类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "走进医学",
    "app": "长江雨课堂",
    "cat": "科学素养类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "身边的营养学",
    "app": "长江雨课堂",
    "cat": "科学素养类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "不朽的艺术：走进大师与经典",
    "app": "长江雨课堂",
    "cat": "艺术美育类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "中国电影经典影片鉴赏",
    "app": "长江雨课堂",
    "cat": "艺术美育类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "设计之美",
    "app": "长江雨课堂",
    "cat": "艺术美育类",
    "pri": 2,
    "pin": 1
  },
  {
    "name": "人力资源管理-基于创新创业视角",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "公共关系与人际交往能力",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "可再生能源与低碳社会",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "舌尖上的历史与文化",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "艾滋病、性与健康",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "解码国家安全",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "走进中国",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "运动安全与健康",
    "app": "知到",
    "cat": "人文情怀类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "创践-大学生创新创业实务",
    "app": "知到",
    "cat": "创新创业类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "国际关系分析",
    "app": "知到",
    "cat": "国际视野类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "美国史",
    "app": "知到",
    "cat": "国际视野类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "创新工程实践",
    "app": "知到",
    "cat": "科学素养类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "大学生安全文化",
    "app": "知到",
    "cat": "科学素养类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "实验室安全与防护",
    "app": "知到",
    "cat": "科学素养类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "急救在身边",
    "app": "知到",
    "cat": "科学素养类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "中国戏曲剧种鉴赏",
    "app": "知到",
    "cat": "艺术美育类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "电影音乐欣赏",
    "app": "知到",
    "cat": "艺术美育类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "设计与审美概论",
    "app": "知到",
    "cat": "艺术美育类",
    "pri": 3,
    "pin": 1
  },
  {
    "name": "世界一流名校国际化课程",
    "app": "NeoSchool",
    "cat": "国际视野类",
    "pri": 4,
    "pin": 1
  }
];

  // 课程名别名（教务系统写法可能和清单不完全一致）
  const NAME_ALIASES = {
  "大国  兵器": "大国兵器",
  "世界遗产与文明互鉴": "人类遗产与文明互鉴",
  "建筑·文化生活": "建筑·文化·生活",
  "大模型应用与实践": "大语言模型应用与实践",
  "创践——大学生创新创业实务": "创践-大学生创新创业实务"
};

  // 思政课批次的目标教学班（按教学班编号匹配）
  const TARGETS_SZ = [
  {
    "code": "202615803",
    "name": "中华文化通识",
    "tier": "网课",
    "rank": 1,
    "size": "300",
    "online": true,
    "rotating": false
  },
  {
    "code": "202615499",
    "name": "中华人民共和国史",
    "tier": "星期一 9-10节",
    "rank": 2,
    "size": "文档未填",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615368",
    "name": "中共党史",
    "tier": "星期四 9-10节",
    "rank": 3,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615501",
    "name": "中华人民共和国史",
    "tier": "星期四 9-10节",
    "rank": 3,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615375",
    "name": "中华民族发展史",
    "tier": "星期六 5-6节",
    "rank": 4,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615377",
    "name": "改革开放史",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615378",
    "name": "改革开放史",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615463",
    "name": "改革开放史",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615372",
    "name": "中国特色社会主义法治思想及实践",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615374",
    "name": "中华民族发展史",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615376",
    "name": "社会主义发展史",
    "tier": "星期六 3-4节",
    "rank": 5,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615462",
    "name": "改革开放史",
    "tier": "星期六 1-2节",
    "rank": 6,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615371",
    "name": "中国特色社会主义法治思想及实践",
    "tier": "星期六 1-2节",
    "rank": 6,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615373",
    "name": "中华民族发展史",
    "tier": "星期六 1-2节",
    "rank": 6,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615379",
    "name": "改革开放史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615366",
    "name": "中共党史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615367",
    "name": "中共党史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615369",
    "name": "中共党史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615370",
    "name": "中共党史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": false
  },
  {
    "code": "202615500",
    "name": "中华人民共和国史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": true
  },
  {
    "code": "202615502",
    "name": "中华人民共和国史",
    "tier": "兜底（星期三 / 星期五 9-10节）",
    "rank": 7,
    "size": "135",
    "online": false,
    "rotating": true
  }
];

  // 自动重试：分类加载为空时最多重试几轮、每轮间隔
  const RETRY_MAX_ROUNDS = 3;
  const RETRY_INTERVAL_MS = 2500;
  const RETRY_START_DELAY_MS = 8000;

  // 提交选课/退课前是否弹确认框（强烈建议 true）
  const CONFIRM_BEFORE_SUBMIT = true;

  // 自动降级：默认开启。
  // 每次提交都自动判断 —— 能找到页面按钮就走正常模式（点按钮）；
  // 找不到按钮（页面没渲染出来 / 分类加载失败 / 网络卡住）才降级直发 POST。
  // 关闭后：按钮不可用时直接拒绝提交，不会直发。
  const ALLOW_DIRECT_POST = true;

  // 选课页美化：默认开启。隐藏 19 列里的 14 个低价值列，只留
  // 操作 / 教学班名称 / 上课时间地点 / 教师 / 已选容量，并给网课加平台标签。
  const BEAUTIFY_DEFAULT = true;

  // 面板默认最小化。想在「页面上出现目标」时自动展开一次，改成 true。
  const AUTO_EXPAND_WHEN_HIT = false;
  let autoExpanded = false;

  /* ============================================================
   *  样式
   * ============================================================ */

  const CSS = `
  .xkh-row-hit > td { background: #fff6d6 !important; }
  .xkh-row-first > td { background: #ffe9b8 !important; box-shadow: inset 0 0 0 1px #e0a800; }
  .xkh-jump > td { background: #d8ecff !important; box-shadow: inset 0 0 0 2px #2f6fed; }
  .xkh-badge { display:inline-block; margin-left:5px; padding:1px 6px; border-radius:99px;
    font-size:10.5px; font-weight:700; vertical-align:middle; }
  .xkh-badge-app { background:#e8eef8; color:#33507d; }
  .xkh-badge-app.p1 { background:#dff5f1; color:#0b6357; }
  .xkh-badge-app.p2 { background:#fdf0dc; color:#8c5310; }
  .xkh-badge-app.p3 { background:#f2e9fb; color:#6f3a9e; }
  .xkh-badge-app.p4 { background:#eceef1; color:#5a6472; }
  .xkh-badge-pin { background:#ffe3e3; color:#b3261e; }
  .xkh-badge-online { background:#d6f5e4; color:#0a7a45; border:1px solid #9fe0bb; }
  .xkh-badge-done { background:#dff5f1; color:#0b6357; }
  .xkh-badge-full { background:#fdf0dc; color:#8c5310; }
  .xkh-item.xkh-pin { background:#fff8f8; border-color:#f6d5d5; }
  .xkh-item.xkh-pin .rk { background:#d64545; }

  #xkh-panel { position:fixed; right:16px; bottom:16px; width:460px; z-index:999999;
    background:#fff; color:#1c2024; border:1px solid #dfe3e8; border-radius:12px;
    box-shadow:0 8px 28px rgba(20,30,50,.16);
    font:13px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",Roboto,sans-serif; }
  #xkh-panel * { box-sizing:border-box; }
  #xkh-head { display:flex; align-items:center; gap:8px; padding:11px 14px; cursor:move;
    border-bottom:1px solid #eef1f4; background:#f7f9fc; border-radius:12px 12px 0 0; user-select:none; }
  #xkh-head b { font-size:14.5px; }
  #xkh-head .sp { flex:1; }
  #xkh-head button { border:1px solid #dfe3e8; background:#fff; border-radius:7px; cursor:pointer;
    font-size:12px; padding:3px 9px; color:#5a6472; font-family:inherit; }
  #xkh-head button:hover { background:#eef2f7; }
  #xkh-body { padding:12px 14px 14px; max-height:62vh; overflow:auto; }

  .xkh-search { width:100%; padding:7px 11px; border:1px solid #dfe3e8; border-radius:8px;
    font-size:13px; font-family:inherit; margin-bottom:9px; }
  .xkh-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .xkh-row label { display:flex; align-items:center; gap:5px; cursor:pointer; font-size:12.5px; color:#5a6472; }
  .xkh-row select { padding:4px 8px; border:1px solid #dfe3e8; border-radius:7px;
    font-size:12.5px; font-family:inherit; background:#fff; color:#1c2024; }
  .xkh-mode { margin:8px 0 6px; padding:7px 11px; border-radius:8px; background:#f2f6fd;
    border:1px solid #dbe7fb; font-size:12.5px; color:#33507d; }
  .xkh-mode b { color:#1d4ed8; }
  .xkh-stat { font-size:12px; color:#5a6472; margin:6px 0; }
  .xkh-act { display:flex; gap:7px; margin-top:8px; }
  .xkh-act button { flex:1; padding:6px 0; border-radius:8px; border:1px solid #2f6fed;
    background:#2f6fed; color:#fff; font-size:12.5px; cursor:pointer; font-family:inherit; font-weight:600; }
  .xkh-act button.ghost { background:#fff; color:#2f6fed; }
  .xkh-act button:hover { filter:brightness(.95); }
  .xkh-sec { margin-top:12px; border-top:1px solid #eef1f4; padding-top:8px; }
  .xkh-sec h4 { margin:0 0 6px; font-size:12.5px; color:#3a4350; display:flex; align-items:center; gap:7px; }
  .xkh-sec h4 .n { font-weight:400; color:#8a94a3; font-size:11.5px; }
  .xkh-item { display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:7px;
    cursor:pointer; border:1px solid transparent; }
  .xkh-item:hover { background:#f2f6fd; border-color:#dbe7fb; }
  .xkh-item .rk { width:18px; height:18px; border-radius:5px; background:#2f6fed; color:#fff;
    display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:700; flex:none; }
  .xkh-item .nm { flex:1; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .xkh-item .cd { font-family:Consolas,monospace; font-size:10.5px; color:#8a94a3; flex:none; }
  .xkh-item.xkh-miss .rk { background:#c8ced6; }
  .xkh-item.xkh-miss .nm { color:#98a1ad; }
  .xkh-item.xkh-selected .nm::after { content:'已选'; margin-left:6px; padding:1px 6px;
    border-radius:99px; font-size:10.5px; background:#e3f6ec; color:#12734a; font-weight:700; }
  .xkh-item.xkh-full .nm::after { content:'已满·可试'; margin-left:6px; padding:1px 6px;
    border-radius:99px; font-size:10.5px; background:#fdf0dc; color:#8c5310; font-weight:700; }
  .xkh-item.xkh-full .nm { color:#8a94a3; }
  .xkh-item .go { flex:none; padding:1px 8px; border-radius:6px; border:1px solid #2f6fed;
    background:#fff; color:#2f6fed; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; }
  .xkh-item .go:hover { background:#2f6fed; color:#fff; }
  .xkh-item .go:disabled { border-color:#d7dce2; color:#aab2bc; cursor:not-allowed; background:#f6f7f9; }
  .xkh-log { font-size:11.5px; color:#8a94a3; margin-top:9px; max-height:80px; overflow:auto;
    border-top:1px solid #eef1f4; padding-top:6px; }
  .xkh-log div { padding:1px 0; }
  .xkh-item.xkh-probe { padding:3px 6px; }
  .xkh-item.xkh-probe .nm { font-size:12px; }
  .xkh-act button#xkh-probe { border-color:#8a5a1e; color:#8a5a1e; }
  .xkh-act button#xkh-probe:hover { background:#fff8f0; }

  /* ============================================================
   *  选课页美化（只作用于带 .xkh-table 的表，即美化开关打开时）
   *  19 列里隐藏 14 个低价值列，只留：
   *    1 操作 / 6 教学班名称 / 9 上课时间地点 / 10 教师名称 / 12 已选容量
   * ============================================================ */
  table.xkh-table th:nth-child(2),  table.xkh-table td:nth-child(2),
  table.xkh-table th:nth-child(3),  table.xkh-table td:nth-child(3),
  table.xkh-table th:nth-child(4),  table.xkh-table td:nth-child(4),
  table.xkh-table th:nth-child(5),  table.xkh-table td:nth-child(5),
  table.xkh-table th:nth-child(7),  table.xkh-table td:nth-child(7),
  table.xkh-table th:nth-child(8),  table.xkh-table td:nth-child(8),
  table.xkh-table th:nth-child(11), table.xkh-table td:nth-child(11),
  table.xkh-table th:nth-child(13), table.xkh-table td:nth-child(13),
  table.xkh-table th:nth-child(14), table.xkh-table td:nth-child(14),
  table.xkh-table th:nth-child(15), table.xkh-table td:nth-child(15),
  table.xkh-table th:nth-child(16), table.xkh-table td:nth-child(16),
  table.xkh-table th:nth-child(17), table.xkh-table td:nth-child(17),
  table.xkh-table th:nth-child(18), table.xkh-table td:nth-child(18),
  table.xkh-table th:nth-child(19), table.xkh-table td:nth-child(19) { display: none !important; }

  table.xkh-table { table-layout: auto !important; width: 100% !important; }
  table.xkh-table th, table.xkh-table td {
    padding: 4px 7px !important; font-size: 12.5px !important; line-height: 1.5 !important;
    vertical-align: middle !important; word-break: break-word !important;
  }
  table.xkh-table thead th { font-size: 12px !important; padding: 5px 7px !important; }
  /* 固定列宽（Ryan 指定）：操作 59 / 教学班名称 196 / 上课时间地点 200 / 教师 80 / 已选容量 70
   * 合计 605px。列宽由 JS 按表头文字打上 xkh-w1..w5 类（不写死 nth-child，防列序变化）。 */
  table.xkh-table { width: 605px !important; min-width: 605px !important; max-width: 605px !important; }
  table.xkh-table th.xkh-w1, table.xkh-table td.xkh-w1 { width:59px !important;  min-width:59px !important;  max-width:59px !important; }
  table.xkh-table th.xkh-w2, table.xkh-table td.xkh-w2 { width:196px !important; min-width:196px !important; max-width:196px !important;
    white-space: normal !important; overflow-wrap: break-word !important; }
  table.xkh-table th.xkh-w3, table.xkh-table td.xkh-w3 { width:200px !important; min-width:200px !important; max-width:200px !important;
    white-space: normal !important; overflow-wrap: break-word !important; }
  table.xkh-table th.xkh-w4, table.xkh-table td.xkh-w4 { width:80px !important;  min-width:80px !important;  max-width:80px !important;
    white-space: nowrap !important; }
  table.xkh-table th.xkh-w5, table.xkh-table td.xkh-w5 { width:70px !important;  min-width:70px !important;  max-width:70px !important;
    white-space: nowrap !important; }
  /* 表头行矮一点 */
  table.xkh-table thead th { padding: 1px 5px !important; font-size: 11.5px !important;
    line-height: 1.25 !important; }

  /* ---------- 一页展示全部（flat 模式）----------
   * 教务系统切分类会**每次都重新请求** listjxbDataV2（实测无缓存），
   * 反复切会明显加重拥堵。所以这里把所有分类的内容同时显示，
   * 用插件自己的「课程归属」做本地筛选，彻底不再触发请求。 */
  body.xkh-flat .tab-content > .tab-pane {
    display: block !important; opacity: 1 !important; visibility: visible !important; }
  body.xkh-flat #myTab { display: none !important; }          /* 隐藏系统分类页签 */
  body.xkh-flat .xkh-cat-sep {
    display: block !important; margin: 8px 0 4px; padding: 3px 8px;
    background: #eef2f8; border-left: 3px solid #2f6fed; border-radius: 5px;
    font-size: 12px; font-weight: 700; color: #33507d; }
  table.xkh-table .timePlace-item { display: inline-block !important; margin: 0 8px 0 0 !important;
    padding: 0 !important; font-size: 12px !important; }
  table.xkh-table tbody tr:hover > td { background: #f4f8ff !important; }

  /* 需要高亮的分类页签（仅公选课批次） */
  [id^="xkgz_li_"].xkh-tab-hl > a { color:#b3261e !important; font-weight:700 !important; }
  [id^="xkgz_li_"].xkh-tab-hl > a::after {
    content:'★'; margin-left:4px; font-size:11px; color:#d64545; }
  [id^="xkgz_li_"].xkh-tab-hl { background:#fff4f4 !important; border-radius:6px; }

  /* 「温馨提醒：当前选课截止时间还剩…」提示条 —— 原本 padding 17/15 + margin-bottom 20，
   * 整条占 74px，太高。压到约一半。 */
  body.xkh-beautified div.alert.alert-warning:has(.wxtips) {
    padding: 4px 12px !important; margin: 0 0 6px !important;
    font-size: 12px !important; line-height: 1.5 !important; }
  body.xkh-beautified div.alert.alert-warning:has(.wxtips) .wxtips { margin-right: 4px !important; }
  /* flat 模式下每个分类各有一条一模一样的提示条 —— 由 JS 只保留第一条（.xkh-tip-keep） */
  body.xkh-flat div.alert.alert-warning:has(.wxtips) { display: none !important; }
  body.xkh-flat div.alert.alert-warning.xkh-tip-keep:has(.wxtips) { display: block !important; }

  /* 网课平台标签（美化模式下加在课程名后面） */
  .xkh-plat { display:inline-block; margin-left:6px; padding:0 6px; border-radius:99px;
    font-size:10.5px; font-weight:700; background:#e8eef8; color:#33507d; vertical-align:middle;
    white-space:nowrap; }
  .xkh-plat.p1 { background:#dff5f1; color:#0b6357; }
  .xkh-plat.p2 { background:#fdf0dc; color:#8c5310; }
  .xkh-plat.p3 { background:#f2e9fb; color:#6f3a9e; }
  .xkh-plat.pin { background:#ffe3e3; color:#b3261e; }
  /* 兜底规则识别出的网课（不在公选课清单里，靠「教师=网络线上教学 / 时间=--/--」判定）
   * 用醒目的绿色，别用灰色 —— 思政批次的网课就靠它标出来 */
  .xkh-plat.p9 { background:#d6f5e4; color:#0a7a45; border:1px solid #9fe0bb; }
  .xkh-plat.off { background:#f1f3f6; color:#7a8494; }

  /* ---------- 进一步压缩（v3.5）----------
   * 每个课程原本是 div.panel > (div.panel-heading + div.panel-collapse > table)
   * panel-heading 只是「课程名 - 学分 教学班个数 点击下拉」的折叠开关，展开后纯属冗余，
   * 每个课程白占 58px；再加上 panel 的 margin-top:20px 和 panel-body 的 padding:15px，
   * 一个课程光外壳就浪费约 100px。
   * 这里把 heading 藏掉、margin/padding 压到最小，并在够宽时排成两列。
   * ---------------------------------------- */
  body.xkh-beautified div.panel.panel-success { margin: 0 0 3px !important; }
  body.xkh-beautified div.panel-heading { display: none !important; }
  body.xkh-beautified div.panel-collapse { border: none !important; }
  body.xkh-beautified div.panel-body { padding: 2px 6px !important; }
  body.xkh-beautified div.panel-success {
    border-radius: 6px !important; border-color: #e6ebf1 !important; }

  /* 多列排布，**从上到下**填列（不是从左到右）。
   *
   * 用 CSS 多列布局（column-width）而不是 flex/grid：
   *   - flex-wrap / grid 的流动方向是「从左到右，排满一行再换行」；
   *   - 多列布局是「先填满第一列，再填第二列」—— 正是要的从上到下。
   *   - column-width 是**理想列宽**，浏览器自己算能放几列，所以自动适应窗口宽度。
   *
   * 基准 700px 是按内容算的：课程名 ~250 + 上课时间地点 ~200 + 教师 ~80
   * + 已选容量 ~70 + 操作 ~60 + 内边距 ≈ 680px。低于这个宽度内容会被压扁。
   */
  body.xkh-beautified [id^="xkgz_content_"] {
    display: block !important;
    column-width: auto !important;    /* 具体列数/列宽由 applyColumnLayout() 按窗口算 */
    column-gap: 10px !important;
    overflow-x: hidden !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  body.xkh-beautified [id^="xkgz_content_"] > div.panel {
    break-inside: avoid !important;
    -webkit-column-break-inside: avoid !important;
    page-break-inside: avoid !important;
    width: auto !important;
    min-width: 0 !important;
    margin: 0 0 6px !important;
  }
  /* 隐藏课程块必须用带 !important 的 class，不能只写行内 style.display ——
   * 上面的规则里有 !important，会盖掉行内样式，导致「隐藏了但还占着高度、留一条线」。 */
  body.xkh-beautified div.panel.xkh-hide { display: none !important; }

  /* 「教师名称」和「已选/容量」两列收窄：width:1% + nowrap 让列宽贴住内容 */
  table.xkh-table td.xkh-narrow, table.xkh-table th.xkh-narrow {
    width: 1% !important; min-width: 0 !important; max-width: none !important;
    white-space: nowrap !important;
  }

  /* 美化模式下的筛选工具条 */
  #xkh-beauty-bar { display:flex; align-items:center; gap:9px; flex-wrap:wrap;
    padding:7px 10px; margin:0 0 8px; background:#f7f9fc; border:1px solid #e3e8ef;
    border-radius:9px; font:12.5px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
    color:#5a6472; }
  #xkh-beauty-bar b { color:#1c2024; font-size:12.5px; }
  #xkh-beauty-bar select { padding:3px 7px; border:1px solid #dfe3e8; border-radius:7px;
    font-size:12.5px; font-family:inherit; background:#fff; color:#1c2024; }
  #xkh-beauty-bar .n { color:#8a94a3; }
  #xkh-beauty-bar .xkh-bb-clear { margin-left:auto; padding:3px 10px; border-radius:7px;
    border:1px solid #dfe3e8; background:#fff; color:#5a6472; cursor:pointer;
    font-size:12.5px; font-family:inherit; }
  #xkh-beauty-bar .xkh-bb-clear:hover { background:#eef2f7; }
  #xkh-beauty-bar .xkh-bb-ck { display:flex; align-items:center; gap:5px; cursor:pointer;
    font-size:12.5px; color:#5a6472; }
  #xkh-beauty-bar .xkh-bb-ck input { margin:0; }

  #xkh-toggle { position:fixed; right:16px; bottom:16px; z-index:999999;
    width:46px; height:46px; border-radius:50%; border:none; cursor:pointer;
    background:#2f6fed; color:#fff; font-size:17px; font-weight:700;
    box-shadow:0 6px 18px rgba(47,111,237,.4); display:none; font-family:inherit; }
  #xkh-toggle:hover { filter:brightness(1.06); }
  #xkh-toggle .badge { position:absolute; top:-4px; right:-4px; min-width:19px; height:19px;
    padding:0 5px; border-radius:99px; background:#d64545; color:#fff; font-size:11px;
    line-height:19px; font-weight:700; display:none; }
  #xkh-toggle.has-hit .badge { display:block; }

  #xkh-modal-mask { position:fixed; inset:0; background:rgba(20,28,40,.42); z-index:1000000;
    display:flex; align-items:center; justify-content:center; }
  #xkh-modal { width:420px; max-width:92vw; background:#fff; border-radius:12px; overflow:hidden;
    box-shadow:0 16px 48px rgba(10,20,40,.3);
    font:13px/1.65 -apple-system,"Segoe UI","Microsoft YaHei",Roboto,sans-serif; color:#1c2024; }
  #xkh-modal .mh { padding:14px 18px 0; font-size:15px; font-weight:700; }
  #xkh-modal .mb { padding:10px 18px 4px; }
  #xkh-modal .kv { display:flex; gap:9px; padding:4px 0; border-bottom:1px dashed #eef1f4; }
  #xkh-modal .kv:last-child { border-bottom:none; }
  #xkh-modal .kv .k { width:76px; flex:none; color:#7a8494; font-size:12.5px; }
  #xkh-modal .kv .v { flex:1; word-break:break-all; }
  #xkh-modal .warn { margin:10px 0 0; padding:9px 12px; background:#fff8f0;
    border-left:3px solid #d9822b; border-radius:6px; font-size:12.5px; color:#8a5a1e; }
  #xkh-modal .mf { display:flex; gap:9px; padding:14px 18px 16px; }
  #xkh-modal .mf button { flex:1; padding:8px 0; border-radius:9px; font-size:13px; cursor:pointer;
    font-family:inherit; font-weight:600; border:1px solid #dfe3e8; background:#fff; color:#5a6472; }
  #xkh-modal .mf button.pri { background:#2f6fed; border-color:#2f6fed; color:#fff; }
  #xkh-modal .mf button.danger { background:#d64545; border-color:#d64545; color:#fff; }
  #xkh-modal .mf button:hover { filter:brightness(.96); }
  `;

  /* ============================================================
   *  索引与工具
   * ============================================================ */

  const SZ_CODES = new Set(TARGETS_SZ.map(t => t.code));
  const SZ_BY_CODE = {}; TARGETS_SZ.forEach(t => { SZ_BY_CODE[t.code] = t; });
  const ONLINE_BY_NAME = {};
  ONLINE_XK.forEach(o => { ONLINE_BY_NAME[o.name] = o; });
  const ALIAS = {}; Object.keys(NAME_ALIASES).forEach(k => { ALIAS[k] = NAME_ALIASES[k]; });

  const logLines = [];
  function log(msg) {
    const t = new Date().toTimeString().slice(0, 8);
    logLines.push('[' + t + '] ' + msg);
    if (logLines.length > 60) logLines.shift();
    const el = document.getElementById('xkh-log');
    if (el) el.innerHTML = logLines.map(x => '<div>' + x + '</div>').join('');
  }

  function scanRows() {
    const out = [];
    document.querySelectorAll('td.jxbbhTd').forEach(td => {
      const code = (td.textContent || '').trim();
      if (!/^\d{6,}$/.test(code)) return;
      const tr = td.closest('tr');
      if (tr) out.push({ code, tr, td });
    });
    return out;
  }

  function cell(tr, cls) {
    const c = tr.querySelector('td.' + cls);
    return c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }
  function rowName(tr) { return cell(tr, 'jxbmcTd'); }

  /** 教务系统的课程名带后缀，如「设计之美(通识教育选修课)-理论5215」 */
  function baseName(full) {
    let n = full || '';
    n = n.replace(/[（(][^）)]*[）)]/g, '');
    n = n.replace(/-理论\s*\d*\s*$/, '');
    n = n.replace(/-\S+\s*$/, '');
    return n.trim();
  }
  function normName(n) { n = (n || '').trim(); return ALIAS[n] || n; }

  /** 这行是不是清单里的网课？返回清单条目或 null */
  function matchOnline(tr) {
    const b = baseName(rowName(tr));
    return ONLINE_BY_NAME[b] || ONLINE_BY_NAME[normName(b)] || null;
  }
  /** 这行是不是思政课目标？返回目标或 null */
  function matchSz(row) { return SZ_BY_CODE[row.code] || null; }

  /* ============================================================
   *  分类（页签）操作
   *  页面是 Bootstrap tab：可点的是 <a id="navItem_<pcid>" data-toggle="tab">，
   *  不是外面的 <li>（点 li 无效，踩过）。
   *  7 个分类的内容其实都渲染在 DOM 里，只是非当前分类被隐藏 ——
   *  所以「找不到行」往往不是没加载，而是没切到那个分类。
   * ============================================================ */

  function rowCategory(tr) {
    const c = tr.closest('[id^="xkgz_content_"]');
    return c ? c.id.replace('xkgz_content_', '') : null;
  }
  function activeCategory() {
    const li = document.querySelector('[id^="xkgz_li_"].active');
    return li ? li.id.replace('xkgz_li_', '') : null;
  }
  function categoryName(pcid) {
    const li = document.getElementById('xkgz_li_' + pcid);
    const a = li ? li.querySelector('a') : null;
    return a ? (a.textContent || '').trim() : (pcid || '').slice(0, 8);
  }
  function rowVisible(tr) { return tr.offsetParent !== null; }

  /** 切到指定分类。返回 true 表示已（或本就是）当前分类 */
  function switchCategory(pcid) {
    if (!pcid) return false;
    if (activeCategory() === pcid) return true;
    const a = document.getElementById('navItem_' + pcid);
    if (!a) return false;
    a.click();
    return true;
  }

  /** 页面上所有分类页签：pcid -> 名称 */
  function allCategories() {
    const out = [];
    document.querySelectorAll('[id^="xkgz_li_"]').forEach(li => {
      const pcid = li.id.replace('xkgz_li_', '');
      const a = li.querySelector('a');
      const name = a ? (a.textContent || '').trim() : pcid.slice(0, 8);
      if (name) out.push({ pcid: pcid, name: name });
    });
    return out;
  }

  /**
   * 兜底：不靠名单，直接按页面特征判断这一行是不是网课。
   * 规则（任一满足）：
   *   - 授课教师 = 「网络线上教学」
   *   - 上课时间地点 = 「--/--」（无固定排课时间地点）
   * 用于「名单里没有的课」也能被识别出来。
   */
  function looksOnline(tr) {
    const teacher = cell(tr, 'teacherTd');
    const time = cell(tr, 'sksjddTd').replace(/\s+/g, '');
    if (/网络线上教学/.test(teacher)) return true;
    if (time === '--/--' || time === '--' || time === '/') return true;
    return false;
  }

  function describeRow(tr) {
    let ratio = '';
    for (const td of tr.querySelectorAll('td')) {
      const t = (td.textContent || '').trim();
      if (/^\d+\s*\/\s*\d+$/.test(t)) { ratio = t.replace(/\s+/g, ''); break; }
    }
    return {
      name: rowName(tr), code: cell(tr, 'jxbbhTd'), teacher: cell(tr, 'teacherTd'),
      time: cell(tr, 'sksjddTd'), place: cell(tr, 'kkxqTd'),
      type: cell(tr, 'kcxzTd') || cell(tr, 'typeTd'), ratio: ratio
    };
  }

  // 注意：键必须是 describeRow / 调用方传进来的**英文键**。
  // 踩过两次坑：这里写中文键去查英文键的对象，结果确认框里所有字段都是空的。
  const FIELDS = [
    ['课程名称', 'name'], ['教学班编号', 'code'], ['授课教师', 'teacher'],
    ['上课时间', 'time'], ['开课校区', 'place'], ['已选/容量', 'ratio'],
    ['课程性质', 'type'], ['所属分类', 'cat'], ['jxbid', 'jxbid']
  ];

  /**
   * 从行内选课按钮的 onclick 读出 jxbid / pcid（不写死 ID）。
   * 坑：unzzxkbtn 里包含 zzxkbtn 子串，必须显式排除退课按钮。
   *
   * 注意：课程已满时页面按钮文案变成「已满」，但它**没有 disabled**、onclick 也还在
   *      —— 也就是说已满的课依然可以尝试选（可能有人退课腾出名额）。
   *      所以这里不排除「已满」，只把 full 标记带出去，由 UI 提示 + 确认框加警告。
   */
  function getSelectAction(tr) {
    for (const btn of tr.querySelectorAll('button')) {
      const oc = btn.getAttribute('onclick') || '';
      if (!/zzxkbtn\s*\(/.test(oc)) continue;
      if (/unzzxkbtn\s*\(/.test(oc)) continue;
      if (btn.disabled) continue;
      const m = oc.match(/zzxkbtn\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/);
      if (m) {
        return {
          jxbid: m[1], pcid: m[2], sfyzjxb: m[3], btn: btn,
          full: /已满/.test((btn.textContent || '').trim())
        };
      }
    }
    return null;
  }

  /** 行的状态：selectable（可提交）/ full（已满，仍可尝试）/ selected（已选）/ none */
  function rowState(tr) {
    const act = getSelectAction(tr);
    if (act) return act.full ? 'full' : 'selectable';
    for (const btn of tr.querySelectorAll('button')) {
      if (/unzzxkbtn\s*\(/.test(btn.getAttribute('onclick') || '')) return 'selected';
    }
    return 'none';
  }

  /**
   * 页面上所有退课按钮（来自「已选课程」区域）。
   * 注意真实签名：unzzxkbtn(jxbid, pcid) —— **只有两个参数**，
   * 和选课的 zzxkbtn(jxbid, pcid, sfyzjxb) 三个参数不一样。
   * 所以第三个参数必须写成可选，否则永远匹配不上（踩过这个坑）。
   */
  function getDropActions() {
    const out = [];
    document.querySelectorAll('button[onclick*="unzzxkbtn"]').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      const m = oc.match(/unzzxkbtn\(\s*'([^']*)'\s*,\s*'([^']*)'\s*(?:,\s*'([^']*)'\s*)?\)/);
      const tr = btn.closest('tr');
      if (m && tr) {
        out.push({ jxbid: m[1], pcid: m[2], mode: m[3] || '', btn: btn, tr: tr });
      }
    });
    return out;
  }

  /* ============================================================
   *  批次识别
   * ============================================================ */

  let batch = 'unknown';
  const BATCH_LABEL = { xk: '公选课（通识教育选修课）', sz: '思政类限定性选修课', unknown: '未识别' };

  function detectBatch() {
    const rows = scanRows();
    if (!rows.length) return 'unknown';
    let szHit = 0, xkHit = 0;
    rows.forEach(r => {
      if (matchSz(r)) szHit++;
      if (matchOnline(r.tr)) xkHit++;
    });
    if (szHit > 0) return 'sz';
    if (xkHit > 0) return 'xk';
    return 'unknown';
  }

  /* ============================================================
   *  高亮 / 过滤 / 跳转
   * ============================================================ */

  let onlyTargets = false;

  function applyHighlight() {
    const rows = scanRows();
    const foundSz = new Set(), foundOn = new Set();

    rows.forEach(r => {
      r.tr.classList.remove('xkh-row-hit', 'xkh-row-first');
      const sz = matchSz(r);
      const on = matchOnline(r.tr);
      if (sz) foundSz.add(sz.code);
      if (on) foundOn.add(on.name);
      // 公选课：所有命中的目标都高亮。
      // ★ 思政批次例外：那 21 个教学班**全都是目标**，全高亮 = 没高亮。
      //   思政批次只在下面标出第一顺位。
      if (batch !== 'sz' && (sz || on)) r.tr.classList.add('xkh-row-hit');
    });

    // 第一顺位加粗高亮（思政批次里它就是唯一的高亮行）
    const first = pickFirst(rows);
    if (first) {
      first.tr.classList.add('xkh-row-first');
      if (batch === 'sz') first.tr.classList.add('xkh-row-hit');
    }

    updatePanel(rows.length, foundSz, foundOn);
    applyBeautify();          // 平台标签 + 工具条
    applyRowVisibility();     // 统一决定每一行显示与否
    applyBeautySort();        // 按平台排序（无变化时不写 DOM，避免死循环）
    return { rows, foundSz, foundOn };
  }

  /**
   * 统一的行显示逻辑 —— 只在这里改 display，避免多处互相覆盖。
   * 同时考虑：只看目标 / 课程归属筛选 / 是否网课筛选。
   *
   * 注意：这个页面**每个课程是一个独立的 <table>**（不是一张大表），
   * 所以过滤时要把整个 table 藏掉，只藏 <tr> 会留下一个空表格框。
   */
  function applyRowVisibility() {
    const tbl = courseTables()[0];
    const ownerIdx = tbl ? headerIndex(tbl)['课程归属'] : undefined;
    let shown = 0;
    scanRows().forEach(r => {
      let ok = true;
      if (onlyTargets) {
        const sz = matchSz(r), on = matchOnline(r.tr);
        if (!sz && !on) ok = false;
      }
      if (ok && beautifyOn && bFilterOwner && ownerIdx !== undefined) {
        ok = (cellAt(r.tr, ownerIdx) === bFilterOwner);
      }
      if (ok && beautifyOn && bFilterOnline) {
        const isOn = platformOf(r.tr).online;
        ok = (bFilterOnline === 'y') ? isOn : !isOn;
      }
      // 本地「过滤冲突教学班」——零请求，直接隐藏
      if (ok && beautifyOn && conflictFilter && hasConflict(r.tr)) ok = false;

      // ★ 统一按**行**隐藏，不要在第一步去动 panel 的 class ——
      //   否则第二步（判断「这一块的行是不是全隐藏了」）会看到行还是 display:''，
      //   误判成「还有可见行」再把 panel 取消隐藏，两步互相打架（实测踩过）。
      r.tr.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });

    // 第二步：某个课程块里的教学班全被隐藏了，就把整块也藏掉（别留个空框）
    if (beautifyOn) {
      document.querySelectorAll('[id^="xkgz_content_"] > div.panel').forEach(p => {
        const trs = Array.from(p.querySelectorAll('td.jxbbhTd')).map(td => td.closest('tr'));
        if (!trs.length) return;
        const anyVisible = trs.some(tr => tr.style.display !== 'none');
        p.classList.toggle('xkh-hide', !anyVisible);
      });
    }
    const n = document.getElementById('xkh-bb-n');
    // 只在值真的变化时才写 textContent ——
    // 否则每次写都会产生一条 mutation，MutationObserver 又触发本函数，形成死循环
    if (n) {
      const txt = '显示 ' + shown + ' 条';
      if (n.textContent !== txt) n.textContent = txt;
    }
  }

  /** 排序键：指定优先课程(pin=0)永远最前，其后按 APP 优先级 */
  function sortKey(o) { return (o.pin === 0 ? 0 : 100) + o.pri; }

  /** 当前批次的「第一顺位」：思政批次取 rank 最小；公选批次取指定优先课 > 学习通网课 */
  function pickFirst(rows) {
    if (batch === 'sz') {
      const sorted = TARGETS_SZ.slice().sort((a, b) => a.rank - b.rank);
      for (const t of sorted) {
        const hit = rows.find(r => r.code === t.code);
        if (hit) return hit;
      }
      return null;
    }
    let best = null, bestKey = null;
    rows.forEach(r => {
      const o = matchOnline(r.tr);
      if (!o) return;
      const k = sortKey(o);
      if (bestKey === null || k < bestKey) { bestKey = k; best = r; }
    });
    return best;
  }

  let jumpTimer = null;
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  /**
   * 滚动到目标行。
   *
   * 这个页面有两个坑叠在一起：
   *   1) 表格外面套了**嵌套滚动容器**（div.panel-body / div.panel-collapse，都是 overflow:auto），
   *      scrollIntoView 在这种结构下不稳定；
   *   2) 页面**随时可能重新渲染**，把行节点替换掉。一旦持有的是旧节点，
   *      getBoundingClientRect() 会全返回 0，据此算出的滚动量是错的（甚至反向），
   *      表现就是「滚了但完全没动」。
   *
   * 所以：**每一轮都按 key 重新查找行**，绝不持有节点引用；滚完再校验一次。
   */
  async function doScroll(key, byCode) {
    for (let i = 0; i < 8; i++) {
      const hit = findRow(key, byCode);
      if (!hit || !rowVisible(hit.tr)) { await sleep(150); continue; }
      const tr = hit.tr;

      // 1) 逐级滚动祖先容器
      let e = tr.parentElement;
      while (e && e !== document.body) {
        const cs = getComputedStyle(e);
        if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 10) {
          const rr = tr.getBoundingClientRect(), cr = e.getBoundingClientRect();
          const delta = (rr.top - cr.top) - (cr.height - rr.height) / 2;
          if (Math.abs(delta) > 2) e.scrollTop += delta;
        }
        e = e.parentElement;
      }
      // 2) 滚 window
      const rr = tr.getBoundingClientRect();
      const d2 = rr.top - (window.innerHeight - rr.height) / 2;
      if (Math.abs(d2) > 2) window.scrollBy(0, d2);

      await sleep(150);

      // 3) 用**重新查到的新节点**校验
      const fresh = findRow(key, byCode);
      if (fresh && rowVisible(fresh.tr)) {
        const r2 = fresh.tr.getBoundingClientRect();
        const mid = (r2.top + r2.bottom) / 2;
        if (mid > 0 && mid < window.innerHeight) {
          document.querySelectorAll('.xkh-jump').forEach(el => el.classList.remove('xkh-jump'));
          fresh.tr.classList.add('xkh-jump');
          clearTimeout(jumpTimer);
          jumpTimer = setTimeout(() => fresh.tr.classList.remove('xkh-jump'), 3000);
          return true;
        }
      }
    }
    return false;
  }

  /** 按教学班编号（byCode）或课程名找行 */
  function findRow(key, byCode) {
    const rows = scanRows();
    if (byCode) return rows.find(r => r.code === key) || null;
    return rows.find(r => {
      const o = matchOnline(r.tr);
      if (o && o.name === key) return true;
      return baseName(rowName(r.tr)) === key;    // 清单外的课按名字匹配
    }) || null;
  }

  /**
   * 切到目标所在分类，并等它**布局稳定**后再返回。
   *
   * ★ 两个坑：
   *   1) 切页签会让该分类的表格**整个重新渲染**，旧 <tr> 节点被销毁
   *      （isConnected 变 false），对脱离文档的节点做任何操作都无效。
   *   2) 重新渲染后布局还会**继续变动约 600ms**。如果在这期间滚动，
   *      校验时可能恰好「看起来在视口内」就返回了，随后布局一变又跑出视口 ——
   *      表现就是「滚了但没到位」。
   *   所以这里连续测行位置，直到**连续 3 次读数一致**才认为稳定。
   */
  async function switchAndFind(key, byCode, logPrefix) {
    let hit = findRow(key, byCode);
    if (!hit) return null;
    const pcid = rowCategory(hit.tr);
    if (!pcid || rowVisible(hit.tr)) return hit;      // 本来就在当前分类

    log((logPrefix || '') + '「' + key + '」在「' + categoryName(pcid) + '」分类，正在切换…');
    switchCategory(pcid);

    let lastTop = null, stable = 0;
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      const fresh = findRow(key, byCode);
      if (!fresh || !rowVisible(fresh.tr)) { lastTop = null; stable = 0; continue; }
      const top = Math.round(fresh.tr.getBoundingClientRect().top);
      if (lastTop !== null && Math.abs(top - lastTop) < 2) {
        stable++;
        if (stable >= 2) return fresh;                // 连续 3 次一致 → 稳定
      } else {
        stable = 0;
      }
      lastTop = top;
    }
    return findRow(key, byCode);
  }

  /** 跳转到某一行（必要时先切分类） */
  async function jumpTo(key, byCode) {
    // ★ 如果目标被「美化筛选」藏掉了，必须先把筛选清掉 ——
    //   否则 rowVisible() 永远为 false（panel 是 display:none），跳转只会轮询到超时。
    const pre = findRow(key, byCode);
    if (pre && beautifyOn && (bFilterOnline || bFilterOwner)) {
      const panel = pre.tr.closest('div.panel');
      if (panel && panel.classList.contains('xkh-hide')) {
        log('目标被筛选隐藏，已清除筛选以便定位');
        bFilterOwner = ''; bFilterOnline = '';
        const bar = document.getElementById('xkh-beauty-bar');
        if (bar) {
          const o = bar.querySelector('#xkh-bb-owner'); if (o) o.value = '';
          const n = bar.querySelector('#xkh-bb-online'); if (n) n.value = '';
        }
        applyRowVisibility();
        await sleep(150);
      }
    }

    const hit = await switchAndFind(key, byCode, '');
    if (!hit) { log('没找到 ' + key + '（可能还没加载出来，或该分类为空）'); return false; }
    const ok = await doScroll(key, byCode);
    log((ok ? '已跳转到 ' : '定位失败：') + key);
    return ok;
  }

  /** 跳到优先级最高的、当前页面上存在的网课（默认只看学习通） */
  function jumpToFirstOnline(appFilter) {
    const rows = scanRows();
    const hits = [];
    rows.forEach(r => {
      const o = matchOnline(r.tr);
      if (o && (!appFilter || o.app === appFilter)) hits.push(o);
    });
    if (!hits.length) {
      log(appFilter ? ('页面上没找到 ' + appFilter + ' 的网课，试试「刷新当前分类」')
                    : '页面上没找到清单内的网课');
      return false;
    }
    hits.sort((a, b) => sortKey(a) - sortKey(b));
    const t = hits[0];
    log((t.pin === 0 ? '★ 优先课程：' : '学习通网课：') + t.name);
    return jumpTo(t.name, false);
  }

  /* ============================================================
   *  确认框 + 提交
   * ============================================================ */

  function confirmDialog(title, info, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      const mask = document.createElement('div');
      mask.id = 'xkh-modal-mask';
      const rows = FIELDS.filter(([, k]) => info[k])
        .map(([label, k]) => '<div class="kv"><span class="k">' + label + '</span><span class="v">' + info[k] + '</span></div>')
        .join('');
      mask.innerHTML = '<div id="xkh-modal"><div class="mh">' + title + '</div><div class="mb">' + rows +
        (opts.warn ? '<div class="warn">' + opts.warn + '</div>' : '') +
        '</div><div class="mf"><button id="xkh-m-cancel">取消</button>' +
        '<button id="xkh-m-ok" class="' + (opts.danger ? 'danger' : 'pri') + '">' + (opts.okText || '确认提交') + '</button></div></div>';
      document.body.appendChild(mask);
      const done = v => { mask.remove(); resolve(v); };
      mask.querySelector('#xkh-m-cancel').onclick = () => done(false);
      mask.querySelector('#xkh-m-ok').onclick = () => done(true);
      mask.addEventListener('click', e => { if (e.target === mask) done(false); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', esc); done(false); }
      });
    });
  }

  /**
   * 直接提交选课（不经过页面按钮）。
   *
   * 只在「页面按钮不可用 + 用户显式开启」时才会走到这里。
   * 请求体和页面按钮发出的**完全一致**（实测捕获对照过）：
   *   POST /admin/xsd/xk/xsdXkV2
   *   Content-Type: application/x-www-form-urlencoded; charset=UTF-8
   *   X-Requested-With: XMLHttpRequest
   *   jxbid=<jxbid>&pcid=<pcid>
   *
   * 注意：不传 sfqc —— 页面按钮传的是 sfqc=undefined，jQuery 会省略它，
   * 所以真实请求体里本来就没有 sfqc。这里保持一致。
   */
  async function directPostSelect(jxbid, pcid) {
    const body = new URLSearchParams({ jxbid: jxbid, pcid: pcid }).toString();
    const r = await fetch('/admin/xsd/xk/xsdXkV2', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                 'X-Requested-With': 'XMLHttpRequest' },
      body: body
    });
    let j;
    try { j = await r.json(); }
    catch (e) { j = { ret: -999, msg: '返回不是 JSON：' + (await r.text()).slice(0, 120) }; }
    return j;
  }

  /** 从极速探测结果里找某个目标的 id */
  function probeLookup(key, byCode) {
    if (!probeRows) return null;
    if (byCode) return probeRows.find(r => r.code === key) || null;
    return probeRows.find(r => {
      const b = baseName(r.name);
      return b === key || normName(b) === key;
    }) || null;
  }

  /** 「选」按钮是否可点：页面按钮可用，或（开启了自动降级） */
  function canSubmit(st, key, byCode) {
    if (st === 'selectable' || st === 'full') return true;
    if (st === 'selected') return false;
    return allowDirectPost;      // 开了自动降级就允许点，插件会自己去探测 id
  }

  /** 「选」按钮的悬停提示 */
  function submitTip(st, hasRow, key, byCode) {
    if (!hasRow) return '这一行还没加载出来（可能在别的分类，点一下会自动切过去）';
    if (st === 'selected') return '你已经选上这门课了';
    if (st === 'full') return '已满，但仍可尝试提交（可能有人退课腾出名额）';
    if (st === 'selectable') return '正常模式：点页面的选课按钮（会弹确认框）';
    if (allowDirectPost) return '页面按钮不可用 —— 会自动探测 id 并直接提交（会弹确认框）';
    return '页面按钮不可用。可开启「自动降级」后使用直发提交';
  }

  async function submitSelect(key, byCode) {
    let row = findRow(key, byCode);
    let act = row ? getSelectAction(row.tr) : null;

    // 不在当前分类 → 先切过去；切完必须**重新查行**（表格会重建，旧节点作废）
    if (row && !rowVisible(row.tr)) {
      const fresh = await switchAndFind(key, byCode, '');
      if (fresh) { row = fresh; act = getSelectAction(fresh.tr); }
    }

    // ---------- 路径 A：正常情况，点页面按钮 ----------
    if (row && act) {
      const info = describeRow(row.tr);
      if (CONFIRM_BEFORE_SUBMIT) {
        const ok = await confirmDialog('确认选课' + (act.full ? '（该课已满）' : ''), info, {
          okText: '确认选课',
          warn: act.full
            ? '这门课当前<strong>已满</strong>。页面保留了选课按钮，是因为可能有人退课腾出名额 —— ' +
              '提交后如果失败，教务系统会返回「人数已满」之类的提示。可以过一会儿再试。'
            : '确认后将向教务系统提交这门课的选课请求。提交后如需更改，要另行走退课流程。'
        });
        if (!ok) { log('已取消选课：' + key); return false; }
      }
      try {
        act.btn.click();
        log('→ 已提交选课（页面按钮）：' + info.code + ' ' + info.name +
            '（jxbid=' + act.jxbid.slice(0, 8) + '…）' + (act.full ? ' [该课已满]' : ''));
      } catch (e) { log('✗ 提交出错：' + e.message); return false; }
      setTimeout(applyHighlight, 2500);
      return true;
    }

    // ---------- 路径 B：按钮不可用时的自动降级 —— 直接 POST ----------
    if (!allowDirectPost) {
      log(row ? ('✗ ' + key + ' 这一行没有选课按钮，且未开启「自动降级」')
              : ('✗ 没找到 ' + key + '，可能还没加载出来'));
      return false;
    }

    let p = probeLookup(key, byCode);
    if (!p) {
      log('页面按钮不可用 → 自动做一次极速探测拿 id…');
      await fastProbe();
      p = probeLookup(key, byCode);
    }
    if (!p) {
      log('✗ 探测后仍找不到 ' + key + ' 的 id，无法直发');
      return false;
    }

    if (CONFIRM_BEFORE_SUBMIT) {
      const ok = await confirmDialog('确认选课（降级直发）', {
        name: p.name, code: p.code, teacher: p.teacher,
        time: p.time, ratio: p.ratio, cat: p.cat, jxbid: p.jxbid
      }, {
        okText: '确认直接提交',
        warn: '页面上找不到这门课的选课按钮（页面没渲染出来 / 加载失败），' +
              '将<strong>直接向教务系统发送选课请求</strong>。' +
              '请求体和点击页面按钮完全相同，但不会经过页面自己的后续刷新逻辑。'
      });
      if (!ok) { log('已取消选课：' + key); return false; }
    }

    try {
      log('→ 直接提交：' + p.code + ' ' + p.name + '（jxbid=' + p.jxbid.slice(0, 8) + '…）');
      const res = await directPostSelect(p.jxbid, p.pcid);
      if (res.ret === 0) log('✓ 服务端返回成功：' + (res.msg || 'OK'));
      else log('✗ 服务端拒绝：' + (res.msg || ('ret=' + res.ret)));
      return res.ret === 0;
    } catch (e) {
      log('✗ 直接提交出错：' + e.message);
      return false;
    }
  }

  async function submitDrop(action) {
    const info = describeRow(action.tr);
    const ok = await confirmDialog('确认退课', info, {
      okText: '确认退课', danger: true,
      warn: '退课后名额会立即释放，可能被其他同学选走。确认要退这门课吗？'
    });
    if (!ok) { log('已取消退课'); return false; }
    try { action.btn.click(); log('→ 已提交退课：' + info.name); }
    catch (e) { log('✗ 退课出错：' + e.message); return false; }
    setTimeout(applyHighlight, 2500);
    return true;
  }

  /* ============================================================
   *  空分类重试
   * ============================================================ */

  function emptyCategories() {
    const out = [];
    document.querySelectorAll('[id^="xkgz_content_"]').forEach(c => {
      if (c.querySelectorAll('td.jxbbhTd').length === 0) out.push(c.id.replace('xkgz_content_', ''));
    });
    return out;
  }

  function pickInitFn(pcid) {
    const cont = document.getElementById('xkgz_content_' + pcid);
    if (cont) {
      const sec = cont.closest('[id^="xkgz_"]');
      if (sec && /jhxk/i.test(sec.className || '')) return 'initJhxkData';
      if (sec && /fjjx/i.test(sec.className || '')) return 'initFjxxxkData';
    }
    return 'initGgxxkData';
  }

  /**
   * 单独刷新某个分类的课程数据（网络卡顿 / 该分类加载为空时用）。
   * 调用页面自己的 init 函数重新拉取，不碰其它分类。
   */
  async function refreshCategory(pcid, name) {
    const fn = pickInitFn(pcid);
    if (typeof window[fn] !== 'function') {
      log('找不到刷新函数 ' + fn + '，无法刷新「' + name + '」');
      return false;
    }
    const before = (document.getElementById('xkgz_content_' + pcid) || { querySelectorAll: () => [] })
      .querySelectorAll('td.jxbbhTd').length;
    log('正在刷新「' + name + '」（当前 ' + before + ' 条）…');
    try {
      window[fn](pcid);
    } catch (e) {
      log('刷新出错：' + e.message);
      return false;
    }
    await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
    const after = (document.getElementById('xkgz_content_' + pcid) || { querySelectorAll: () => [] })
      .querySelectorAll('td.jxbbhTd').length;
    log('「' + name + '」刷新完成：' + before + ' → ' + after + ' 条');
    applyHighlight();
    return after > 0;
  }

  /* ============================================================
   *  极速探测：直接调接口拿 id，不等页面渲染
   *
   *  为什么快：id 本来就跟着课程列表一起下发（写在按钮 onclick 里），
   *  所以「拿 id」= 「拿列表」。页面要加载 52 个资源 + 解析 JS + Vue 渲染，
   *  而直接调接口只要 1 个 listV2 + N 个 listjxbDataV2。
   *  实测：只取 1 个分类 ≈ 40 KB / 46 ms；页面整体 ≈ 306 KB。
   *
   *  只读：只把 id 显示出来，绝不提交任何选课请求。
   * ============================================================ */

  let probeRows = null;     // 探测结果缓存

  // listjxbDataV2 的 from 参数（模块标识）。
  // 公选课是 ggxxk，其它模块可能是 jhxk / fjjx / cxxk / bxk ——
  // 思政课批次属于哪个模块现在还没法确认，所以逐个试，谁先返回数据就用谁。
  const FROM_CANDIDATES = ['ggxxk', 'jhxk', 'fjjx', 'cxxk', 'bxk'];

  async function fastProbe() {
    const t0 = performance.now();
    log('极速探测：直接调接口拿 id（不等页面渲染）…');

    const post = async (p, body) => {
      const r = await fetch(p, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                   'X-Requested-With': 'XMLHttpRequest' },
        body: body || ''
      });
      return await r.json();
    };

    let v2;
    try { v2 = await post('/admin/xsd/xk/listV2'); }
    catch (e) { log('探测失败（listV2）：' + e.message); return; }

    if (v2.ret !== 0) { log('探测失败：' + (v2.msg || ('ret=' + v2.ret))); return; }

    const d = v2.data || {};
    const pcencs = d.pcencs || {};
    const maps = d.mapsList || [];
    log('批次 ' + maps.length + ' 个，开始拉课程…');

    const all = [];
    for (const m of maps) {
      // 逐个试 from，直到某个模块返回数据
      let rows = [], usedFrom = null, lastMsg = '';
      for (const from of FROM_CANDIDATES) {
        const body = new URLSearchParams({
          from: from, kcmc: '', kkyx: '', kcxz: '', glymjxb: '', glctjxb: '',
          jxms: '', kcgs: '', teacher: '', pcid: m.xkgzid, kkxq: '', kclb: '',
          pcenc: pcencs[m.xkgzid] || '', kclx: ''
        }).toString();
        let r;
        try { r = await post('/admin/xsd/xk/listjxbDataV2', body); }
        catch (e) { lastMsg = e.message; continue; }
        const got = (r.data && r.data.initData) || [];
        if (got.length) { rows = got; usedFrom = from; break; }
        lastMsg = r.msg || '';
      }
      rows.forEach(x => all.push({
        jxbid: x.id || '', code: x.jxbbh || '', name: x.kcmc || '',
        teacher: (x.teacher || '').trim(),
        time: (x.sksjdd || '').replace(/\s+/g, ' ').trim(),
        ratio: x.yxrl || '', cat: m.xkgzMc || '', pcid: m.xkgzid || '',
        from: usedFrom || ''
      }));
      log('  「' + m.xkgzMc + '」' + rows.length + ' 条' +
          (usedFrom ? '（from=' + usedFrom + '）' : (lastMsg ? '（无数据：' + lastMsg + '）' : '')));
    }

    const ms = Math.round(performance.now() - t0);
    probeRows = all;
    log('★ 探测完成：' + all.length + ' 个教学班，耗时 ' + ms + ' ms');
    renderProbe();
    return all;
  }

  /** 探测结果里，命中的目标（网课清单 + 思政目标 + 清单外疑似网课） */
  function probeTargets() {
    if (!probeRows) return [];
    const out = [];
    const seen = {};
    probeRows.forEach(r => {
      const base = baseName(r.name);
      const o = ONLINE_BY_NAME[base] || ONLINE_BY_NAME[normName(base)];
      const isSz = SZ_CODES.has(r.code);
      const looks = /网络线上教学/.test(r.teacher) ||
                    /^--\/--$/.test(r.time.replace(/\s+/g, ''));
      if (!o && !isSz && !looks) return;
      const key = r.code || r.name;
      if (seen[key]) return;
      seen[key] = 1;
      out.push(Object.assign({}, r, {
        pin: o ? o.pin : 1,
        pri: o ? o.pri : 9,
        app: o ? o.app : '未知',
        sz: isSz,
        extra: !o && !isSz
      }));
    });
    out.sort((a, b) => (a.sz - b.sz) || ((a.pin === 0 ? 0 : 100) + a.pri) - ((b.pin === 0 ? 0 : 100) + b.pri));
    return out;
  }

  function renderProbe() {
    const sec = document.getElementById('xkh-sec-probe');
    const box = document.getElementById('xkh-list-probe');
    if (!sec || !box) return;
    const list = probeTargets();
    if (!probeRows) { sec.style.display = 'none'; return; }
    sec.style.display = '';
    document.getElementById('xkh-probe-n').textContent =
      list.length + ' 个目标（共探测到 ' + probeRows.length + ' 个教学班）';
    box.innerHTML = list.map(r => {
      const tag = r.sz ? '<span class="xkh-badge xkh-badge-pin">思政目标</span>'
                : r.pin === 0 ? '<span class="xkh-badge xkh-badge-pin">优先抢</span>'
                : r.extra ? '<span class="xkh-badge xkh-badge-app">清单外</span>'
                : '<span class="xkh-badge ' + appCls(r.pri) + '">' + r.app + '</span>';
      return '<div class="xkh-item xkh-probe" data-code="' + r.code + '" title="' +
             r.cat + ' · ' + r.teacher + ' · ' + r.time + '">' +
        '<span class="rk">' + (r.sz ? '思' : (r.pin === 0 ? '★' : r.pri)) + '</span>' +
        '<span class="nm">' + r.name + tag + '</span>' +
        '<span class="cd">' + r.code + '</span>' +
        '<span class="cd" style="color:#b6bcc4">' + (r.jxbid || '').slice(0, 6) + '…</span></div>';
    }).join('') || '<div style="padding:6px;color:#8a94a3;font-size:12px">（没探测到目标课程）</div>';

    box.querySelectorAll('.xkh-probe').forEach(el => {
      el.onclick = () => {
        const r = probeRows.find(x => x.code === el.dataset.code);
        if (r) { log('id：' + r.jxbid + '　pcid：' + r.pcid + '　' + r.name); }
        jumpTo(el.dataset.code, true);
      };
    });
  }

  async function retryEmpty(rounds) {
    rounds = rounds || RETRY_MAX_ROUNDS;
    for (let i = 1; i <= rounds; i++) {
      const empties = emptyCategories();
      if (!empties.length) { log('所有分类都有数据 ✓'); return true; }
      log('第 ' + i + '/' + rounds + ' 轮：' + empties.length + ' 个分类为空，尝试重新加载…');
      for (const pcid of empties) {
        const fn = pickInitFn(pcid);
        try {
          if (typeof window[fn] === 'function') window[fn](pcid);
          else log('  找不到函数 ' + fn + '，跳过 ' + pcid.slice(0, 8));
        } catch (e) { log('  ' + fn + '(' + pcid.slice(0, 8) + ') 出错：' + e.message); }
      }
      await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
      applyHighlight();
    }
    const left = emptyCategories();
    log(left.length ? ('仍有 ' + left.length + ' 个分类为空，可稍后手动重试') : '全部加载完成 ✓');
    return left.length === 0;
  }

  /* ============================================================
   *  选课页美化
   *
   *  目标：同样面积下显示更多有效信息。
   *  做法：CSS 隐藏 19 列里的 14 个低价值列（见上方 table.xkh-table 规则），
   *        只留 操作 / 教学班名称 / 上课时间地点 / 教师名称 / 已选容量，
   *        再给网课在课程名后加平台标签，并在表格上方加一条筛选/排序工具条。
   * ============================================================ */

  let beautifyOn = BEAUTIFY_DEFAULT;
  try {
    const _b = localStorage.getItem('xkh_beautify');
    if (_b !== null) beautifyOn = (_b === '1');
  } catch (e) {}
  let bFilterOwner = '';      // 课程归属筛选
  let bFilterOnline = '';     // '' | 'y' | 'n'
  let bSort = '';             // '' | 'plat'

  /* ---------- 批次默认筛选 ----------
   * 只在**公选课批次**生效：默认「绿色工业类 + 只看网课」、默认按网课平台排序。
   * 思政课批次只有一个分类、也没有网课清单，套用这套默认值会把列表筛空 ——
   * 所以一旦识别到思政批次就强制清空，绝不套用。
   */
  const DEFAULT_FILTER_OWNER = '绿色工业类';
  const DEFAULT_FILTER_ONLINE = 'y';
  const DEFAULT_SORT = 'plat';
  // 公选课批次里要高亮的分类页签
  const HIGHLIGHT_CATS = ['艺术美育类', '绿色工业类', '数智素养类'];
  let batchDefaultsDone = false;
  let batchSzCleared = false;

  function applyBatchDefaults(ownerNames) {
    if (batch === 'sz') {
      // ★ 只清一次！这个函数在每次 DOM 变动时都会被调用，
      //   如果每次都清，用户刚选的筛选下一帧就被抹掉 —— 表现为「筛选完全不生效」。
      if (!batchSzCleared) {
        batchSzCleared = true;
        bFilterOwner = ''; bFilterOnline = '';
        log('思政批次：已关闭公选课的默认筛选（本批次只有一个分类）');
      }
      return;
    }
    if (batch !== 'xk' || batchDefaultsDone) return;
    batchDefaultsDone = true;
    bFilterOnline = DEFAULT_FILTER_ONLINE;
    bSort = DEFAULT_SORT;
    // 归属分类要确认本批次真的有，否则会把列表筛空
    if (!ownerNames || !ownerNames.length || ownerNames.indexOf(DEFAULT_FILTER_OWNER) >= 0) {
      bFilterOwner = DEFAULT_FILTER_OWNER;
    } else {
      bFilterOwner = '';
      log('本批次没有「' + DEFAULT_FILTER_OWNER + '」，归属筛选留空');
    }
    log('已套用公选课批次默认筛选：' + (bFilterOwner || '全部分类') + ' / 只看网课 / 按平台排序');

    // ★ 关键：默认筛选是「绿色工业类」，但页面默认停在「艺术美育类」——
    //   不把标签页也切过去的话，列表会是空的（Ryan 报的 bug）。
    if (bFilterOwner) {
      const c = allCategories().find(x => x.name === bFilterOwner);
      if (c && activeCategory() !== c.pcid) {
        switchCategory(c.pcid);
        log('已自动切换到「' + bFilterOwner + '」分类');
      }
    }
  }

  /** 给指定分类页签加高亮（仅公选课批次；思政批次不加） */
  function markTabs() {
    document.querySelectorAll('[id^="xkgz_li_"]').forEach(li => {
      const a = li.querySelector('a');
      const name = a ? (a.textContent || '').trim() : '';
      const on = beautifyOn && batch === 'xk' && HIGHLIGHT_CATS.indexOf(name) >= 0;
      li.classList.toggle('xkh-tab-hl', on);
    });
  }

  /** 找到选课表格（含 td.jxbbhTd 的那个） */
  function courseTables() {
    return Array.from(document.querySelectorAll('table')).filter(t => t.querySelector('td.jxbbhTd'));
  }

  /** 表头文字 -> 列序号（0-based），避免写死列号 */
  function headerIndex(table) {
    const map = {};
    table.querySelectorAll('thead th').forEach((th, i) => {
      const t = (th.textContent || '').replace(/\s+/g, '').trim();
      if (t) map[t] = i;
    });
    return map;
  }

  function cellAt(tr, idx) {
    const td = tr.children[idx];
    return td ? (td.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  /* ---------- 本地「过滤冲突教学班」----------
   * 页面自带的「过滤冲突教学班」复选框（name=initGgxxkDataGlctjxb）默认没勾，
   * 而且它的名字前缀是 initGgxxkData... —— 勾上会**重新请求一次数据**。
   * 这里改成纯本地：直接读行里的冲突标记，隐藏对应课程块，零请求。
   * 冲突标记有两处：panel 表头里的 .all-tag（全部冲突）、教学班名称里的 .has-tag（课程冲突）。
   */
  let conflictFilter = true;

  function hasConflict(tr) {
    if (tr.querySelector('td.jxbmcTd .has-tag')) return true;
    const panel = tr.closest('div.panel');
    if (panel && panel.querySelector('.panel-heading .all-tag')) return true;
    // 兜底：文字里出现「课程冲突」
    const nm = tr.querySelector('td.jxbmcTd');
    return !!(nm && /课程冲突|全部冲突/.test(nm.textContent || ''));
  }

  /* ---------- 一页展示全部（flat 模式）----------
   * 教务系统切分类**每次都重新请求** listjxbDataV2（实测无缓存），
   * 反复切会加重拥堵。flat 模式把所有分类的内容同时显示，
   * 靠插件自己的「课程归属」本地筛选 —— 之后再也不发请求。
   */
  let flatMode = true;

  function contHasRows(pcid) {
    const c = document.getElementById('xkgz_content_' + pcid);
    return !!(c && c.querySelector('td.jxbbhTd'));
  }

  /** 把还没加载过的分类逐个触发一次（每个只拉一次，之后不再请求） */
  async function ensureAllLoaded() {
    const cats = allCategories();
    const missing = cats.filter(c => !contHasRows(c.pcid));
    if (!missing.length) return 0;
    log('首次加载：把 ' + missing.length + ' 个还没加载的分类各拉一次…');
    for (const c of missing) {
      switchCategory(c.pcid);
      await sleep(650);
    }
    log('全部 ' + cats.length + ' 个分类数据已就绪，之后切换不再请求');
    return missing.length;
  }

  function applyFlatMode() {
    const on = beautifyOn && flatMode && batch === 'xk';   // 思政批次不启用
    document.body.classList.toggle('xkh-flat', on);

    // 「温馨提醒…还剩多久」提示条：flat 模式下 7 个分类各有一条一模一样的，
    // 只保留第一条，其余交给 CSS 隐藏（class xkh-tip-keep）。
    const tips = Array.from(document.querySelectorAll('div.alert.alert-warning'))
      .filter(e => e.querySelector('.wxtips'));
    tips.forEach((e, i) => e.classList.toggle('xkh-tip-keep', i === 0));

    if (!on) {
      document.querySelectorAll('.xkh-cat-sep').forEach(e => e.remove());
      return;
    }
    // 每个分类容器前插一个分类标题，一页滚动时能分清是哪一类
    allCategories().forEach(c => {
      const cont = document.getElementById('xkgz_content_' + c.pcid);
      if (!cont || !cont.parentElement) return;
      let sep = cont.parentElement.querySelector('.xkh-cat-sep[data-pcid="' + c.pcid + '"]');
      if (!sep) {
        sep = document.createElement('div');
        sep.className = 'xkh-cat-sep';
        sep.dataset.pcid = c.pcid;
        sep.textContent = c.name;
        cont.parentElement.insertBefore(sep, cont);
      } else if (sep.textContent !== c.name) {
        sep.textContent = c.name;
      }
    });
  }

  /** 隐藏教务系统自带的「课程归属」下拉（和上面的分类页签重复；flat 模式下更是多余） */
  function hideNativeOwnerFilter() {
    const el = document.getElementById('kcgs');
    if (!el) return;
    const wrap = el.closest('.form-group') || el.parentElement;
    if (wrap) wrap.style.display = (beautifyOn && batch === 'xk') ? 'none' : '';
  }

  /**
   * 这一行的平台标签。
   * 返回 { label, cls, online }：
   *   - 清单内网课 → APP 名
   *   - 清单外但符合兜底规则（教师=网络线上教学 / 时间地点=--/--）→ 「网课」
   *   - 其余 → 「线下课」
   * online 用于「是否网课」筛选和排序，不能靠 label 判断。
   */
  function platformOf(tr) {
    const o = matchOnline(tr);
    if (o) return { label: o.app, cls: o.pin === 0 ? 'pin' : ('p' + (o.pri <= 4 ? o.pri : 4)), online: true };
    if (looksOnline(tr)) return { label: '网课', cls: 'p9', online: true };
    return { label: '线下课', cls: 'off', online: false };
  }

  /** 给网课行在课程名后打平台标签；顺带标记表格 */
  function applyBeautify() {
    document.body.classList.toggle('xkh-beautified', beautifyOn);
    const tables = courseTables();
    tables.forEach(t => t.classList.toggle('xkh-table', beautifyOn));
    if (!beautifyOn) {
      document.querySelectorAll('.xkh-plat').forEach(e => e.remove());
      document.querySelectorAll('.xkh-hide').forEach(e => e.classList.remove('xkh-hide'));
      document.querySelectorAll('.xkh-narrow').forEach(e => e.classList.remove('xkh-narrow'));
      document.querySelectorAll('.xkh-tab-hl').forEach(e => e.classList.remove('xkh-tab-hl'));
      const bar = document.getElementById('xkh-beauty-bar');
      if (bar) bar.remove();
      return;
    }
    const firstTable = tables[0];
    const map = firstTable ? headerIndex(firstTable) : {};
    // 表头文字 -> 固定宽度类（不写死 nth-child，列序变了也不会错）
    const WIDTH_CLASS = [
      ['操作', 'xkh-w1'],
      ['教学班名称', 'xkh-w2'],
      ['上课时间/上课地点', 'xkh-w3'],
      ['教师名称', 'xkh-w4'],
      ['已选/容量', 'xkh-w5']
    ];
    const widthMap = {};
    WIDTH_CLASS.forEach(([name, cls]) => { if (map[name] !== undefined) widthMap[map[name]] = cls; });

    // 表头也要标，否则表头与单元格列宽不一致
    tables.forEach(t => {
      t.querySelectorAll('thead th').forEach((th, i) => {
        if (widthMap[i]) th.classList.add(widthMap[i]);
      });
    });

    scanRows().forEach(r => {
      const kids = r.tr.children;
      Object.keys(widthMap).forEach(i => {
        if (kids[i]) kids[i].classList.add(widthMap[i]);
      });
      const nameCell = r.tr.querySelector('td.jxbmcTd');
      if (!nameCell) return;
      const p = platformOf(r.tr);
      const old = nameCell.querySelector('.xkh-plat');
      if (old) {
        if (old.textContent !== p.label) old.textContent = p.label;
        old.className = 'xkh-plat ' + p.cls;
        return;
      }
      const span = document.createElement('span');
      span.className = 'xkh-plat ' + p.cls;
      span.textContent = p.label;
      span.title = p.online ? ('网课平台：' + p.label) : '线下课（有固定上课时间地点）';
      nameCell.appendChild(span);
    });
    buildBeautyBar();
    applyColumnLayout();
    markTabs();
    applyFlatMode();
    hideNativeOwnerFilter();
  }

  /** 把美化栏的「课程归属」同步到浮窗的分类下拉（两边绑同一个状态） */
  function syncOwnerToPanel() {
    const sel = document.getElementById('xkh-cat');
    if (!sel) return;
    if (sel.value !== bFilterOwner) sel.value = bFilterOwner;
  }

  /** 把浮窗的分类下拉同步回美化栏 */
  function syncPanelToOwner() {
    const sel = document.getElementById('xkh-bb-owner');
    if (!sel) return;
    if (sel.value !== bFilterOwner) sel.value = bFilterOwner;
  }

  /** 表格上方的筛选/排序工具条。
   *
   * ★ 结构只建一次，绝不每次重建 innerHTML ——
   *   之前每次 DOM 变动（MutationObserver → applyHighlight → applyBeautify）
   *   都会重建整个工具条，把 <select> 元素销毁重建，
   *   表现就是「下拉选项刚弹出来半秒就被关掉」。
   *   现在只更新下拉的 <option> 列表（且仅在选项集合真的变化时），
   *   计数走单独的 span，不触碰其它节点。
   */
  let beautyBarOwnerKey = '';

  function buildBeautyBar() {
    if (!beautifyOn) return;
    const tbl = courseTables()[0];
    if (!tbl) return;

    let bar = document.getElementById('xkh-beauty-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'xkh-beauty-bar';
      bar.innerHTML =
        '<b>筛选</b>' +
        '<span id="xkh-bb-owner-wrap">课程归属<select id="xkh-bb-owner"></select></span>' +
        '是否网课<select id="xkh-bb-online">' +
          '<option value="">全部课程</option>' +
          '<option value="y">只看网课</option>' +
          '<option value="n">只看线下课</option>' +
        '</select>' +
        '<label class="xkh-bb-ck" title="本地过滤，不会向服务器发请求（页面自带那个会重新请求）">' +
          '<input type="checkbox" id="xkh-bb-conflict"> 过滤冲突教学班</label>' +
        '<b>排序</b><select id="xkh-bb-sort">' +
          '<option value="">默认顺序</option>' +
          '<option value="plat">按网课平台</option>' +
        '</select>' +
        '<span class="n" id="xkh-bb-n"></span>' +
        '<button class="xkh-bb-clear" id="xkh-bb-clear">清除筛选</button>';

      // ★ 必须插在整个 tab 内容区**之前**，不能插进某个课程的 panel-body ——
      //   否则它会出现在第一门课程的表头之后（之前的 bug）。
      const tabContent = document.getElementById('myTabContent');
      if (tabContent && tabContent.parentElement) {
        tabContent.parentElement.insertBefore(bar, tabContent);
      } else {
        const firstCont = document.querySelector('[id^="xkgz_content_"]');
        if (!firstCont || !firstCont.parentElement) return;
        firstCont.parentElement.insertBefore(bar, firstCont);
      }

      // 事件只绑一次
      bar.querySelector('#xkh-bb-owner').onchange = e => {
        bFilterOwner = e.target.value; syncOwnerToPanel(); applyRowVisibility();
      };
      bar.querySelector('#xkh-bb-online').onchange = e => {
        bFilterOnline = e.target.value; applyRowVisibility();
      };
      const ck = bar.querySelector('#xkh-bb-conflict');
      ck.checked = conflictFilter;
      ck.onchange = e => {
        conflictFilter = e.target.checked; applyRowVisibility();
        log(conflictFilter ? '已开启本地「过滤冲突教学班」' : '已关闭「过滤冲突教学班」');
      };
      bar.querySelector('#xkh-bb-sort').onchange = e => {
        bSort = e.target.value; applyBeautySort();
      };
      bar.querySelector('#xkh-bb-clear').onclick = () => {
        bFilterOwner = ''; bFilterOnline = ''; bSort = ''; conflictFilter = false;
        bar.querySelector('#xkh-bb-owner').value = '';
        bar.querySelector('#xkh-bb-online').value = '';
        bar.querySelector('#xkh-bb-sort').value = '';
        bar.querySelector('#xkh-bb-conflict').checked = false;
        syncOwnerToPanel();
        applyRowVisibility();
        log('已清除美化筛选');
      };
    }

    // 课程归属的选项集合：只在真的变化时重建 <option>
    const map = headerIndex(tbl);
    const ownerIdx = map['课程归属'];
    const owners = [];
    if (ownerIdx !== undefined) {
      const seen = {};
      scanRows().forEach(r => {
        const v = cellAt(r.tr, ownerIdx);
        if (v && !seen[v]) { seen[v] = 1; owners.push(v); }
      });
      owners.sort();
    }
    const wrap = bar.querySelector('#xkh-bb-owner-wrap');
    if (wrap) wrap.style.display = ownerIdx !== undefined ? '' : 'none';

    // 首次进入公选课批次时套用默认筛选（思政批次不会被套用）
    applyBatchDefaults(owners);

    const key = owners.join('|');
    const ownerSel = bar.querySelector('#xkh-bb-owner');
    if (key !== beautyBarOwnerKey) {
      beautyBarOwnerKey = key;
      const cur = ownerSel.value;
      ownerSel.innerHTML = '<option value="">全部</option>' +
        owners.map(o => '<option value="' + o + '">' + o + '</option>').join('');
      const keep = owners.indexOf(cur) >= 0 ? cur : '';
      ownerSel.value = keep;
      if (keep !== cur) bFilterOwner = keep;
    }
    // 同步当前值，但不要打断正在展开的下拉
    if (document.activeElement !== ownerSel && ownerSel.value !== bFilterOwner) ownerSel.value = bFilterOwner;
    const onSel = bar.querySelector('#xkh-bb-online');
    if (document.activeElement !== onSel && onSel.value !== bFilterOnline) onSel.value = bFilterOnline;
    const sortSel = bar.querySelector('#xkh-bb-sort');
    if (document.activeElement !== sortSel && sortSel.value !== bSort) sortSel.value = bSort;
  }

  /**
   * 按网课平台排序（学习通 → 长江雨课堂 → 知到 → NeoSchool → 非网课）。
   *
   * ★ 这个页面的结构是：每个课程 = 一个 div.panel > table（表格里还有详情行）。
   *   所以排序单位不能是 table 本身，而要**往上找到直接挂在分类容器下的那一层**
   *   （即 div.panel），否则每个分组里只有 1 个元素，排序等于没做。
   */
  function applyBeautySort() {
    if (!beautifyOn || !bSort) return;

    const rankOf = tbl => {
      // 注意：每个课程的 tbody 里有 2 行，第一行是详情行、不是课程行，
      // 必须按 td.jxbbhTd 定位课程行，否则永远取不到平台（全是 99）。
      const codeTd = tbl.querySelector('td.jxbbhTd');
      const tr = codeTd ? codeTd.closest('tr') : null;
      if (!tr) return 99;
      const p = platformOf(tr);
      if (!p.online) return 99;                 // 线下课排最后
      if (p.cls === 'pin') return 0;
      const n = parseInt((p.cls || 'p9').replace('p', ''), 10);
      return isNaN(n) ? 9 : n;
    };

    const groups = new Map();
    courseTables().forEach(t => {
      const cont = t.closest('[id^="xkgz_content_"]');
      if (!cont) return;
      let unit = t;
      while (unit.parentElement && unit.parentElement !== cont) unit = unit.parentElement;
      if (unit.parentElement !== cont) return;          // 找不到合适层级就跳过
      if (!groups.has(cont.id)) groups.set(cont.id, { cont: cont, units: [] });
      groups.get(cont.id).units.push({ unit: unit, tbl: t });
    });

    groups.forEach(({ cont, units }) => {
      if (units.length < 2) return;
      const sorted = units.slice().sort((a, b) => rankOf(a.tbl) - rankOf(b.tbl));
      // 顺序没变就不动 DOM —— 否则 insertBefore 触发 MutationObserver 会死循环
      if (sorted.every((u, i) => u.unit === units[i].unit)) return;
      const anchor = units[units.length - 1].unit.nextSibling;
      sorted.forEach(u => cont.insertBefore(u.unit, anchor));
    });
  }

  /* ---------- 固定列宽的多列布局 ----------
   * 需求：列宽固定、按窗口宽度决定列数、多余空间留白不拉伸。
   *
   * CSS 多列的毛病是「自动把可用宽度均分给各列」，所以列宽会随窗口变化。
   * 解法：自己算列数 n，然后把**容器宽度**设成 n*COL + (n-1)*GAP ——
   * 容器比父元素窄，多出来的空间自然留白；列宽就固定成 COL 了。
   * 同时用 column-count: n 锁死列数（不写死的话浏览器可能自己多开一列）。
   */
  const COL_W = 622;    // 每列固定宽度 = 表格 605 + panel-body 左右内边距 12 + 边框 2 + 余量
  const COL_GAP = 8;    // 列间距
  let lastColLayout = '';

  function applyColumnLayout() {
    const conts = Array.from(document.querySelectorAll('[id^="xkgz_content_"]'));
    if (!beautifyOn) {
      conts.forEach(c => {
        c.style.removeProperty('width');
        c.style.removeProperty('column-count');
        c.style.removeProperty('column-width');
        delete c.dataset.xkhColKey;
      });
      return;
    }
    conts.forEach(c => {
      const parent = c.parentElement;
      if (!parent) return;
      // 可用宽度取父元素的内容宽度（容器宽度是我们自己设的，不能拿来算）
      const avail = parent.clientWidth;
      // ★ 隐藏的分类容器 clientWidth 是 0 —— 直接跳过。
      //   但它们一旦被切到就会变成可见，那时再算即可（去重 key 存在容器自己身上）。
      if (!avail) return;
      const n = Math.max(1, Math.floor((avail + COL_GAP) / (COL_W + COL_GAP)));
      const w = n * COL_W + (n - 1) * COL_GAP;
      const key = n + ':' + w + ':' + avail;
      // ★ 去重 key 必须**按容器分别存**。之前用一个全局变量，
      //   第一个容器算完就把 key 占住了，后面所有容器都被跳过 ——
      //   表现就是「样式只在部分分类下生效，其他分类拉伸填满窗口」。
      if (c.dataset.xkhColKey === key) return;
      c.dataset.xkhColKey = key;
      c.style.setProperty('width', w + 'px', 'important');
      c.style.setProperty('column-count', String(n), 'important');
      c.style.setProperty('column-width', 'auto', 'important');
    });
  }

  /* ============================================================
   *  面板
   * ============================================================ */

  let showOnlyHit = true;
  let catFilter = '';        // '' = 全部分类
  let allowDirectPost = ALLOW_DIRECT_POST;
  try {
    const _s = localStorage.getItem('xkh_direct_post');
    if (_s !== null) allowDirectPost = (_s === '1');
  } catch (e) {}

  function buildPanel() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const p = document.createElement('div');
    p.id = 'xkh-panel';
    p.innerHTML = `
      <div id="xkh-head">
        <b>选课助手</b><span class="sp"></span>
        <button id="xkh-min" title="收起">—</button>
      </div>
      <div id="xkh-body">
        <input class="xkh-search" id="xkh-q" placeholder="输入课程名 / 教学班编号，回车跳转">
        <div class="xkh-row">
          <select id="xkh-cat" title="按分类筛选列表，并切换到该分类">
            <option value="">全部分类</option>
          </select>
          <label><input type="checkbox" id="xkh-only"> 只看目标</label>
          <label><input type="checkbox" id="xkh-hitonly" checked> 只显示已加载</label>
        </div>
        <div class="xkh-mode" id="xkh-mode">正在识别批次…</div>
        <div class="xkh-stat" id="xkh-stat">正在扫描…</div>
        <div class="xkh-act">
          <button id="xkh-go-online">跳到优先课程</button>
          <button class="ghost" id="xkh-refresh-cat">刷新当前分类</button>
        </div>
        <div class="xkh-act">
          <button class="ghost" id="xkh-go-first">跳到第一顺位</button>
          <button class="ghost" id="xkh-retry">重载空分类</button>
          <button class="ghost" id="xkh-drop">已选/退课</button>
        </div>
        <div class="xkh-act">
          <button class="ghost" id="xkh-probe" title="直接调接口拿 id，不等页面渲染。只读，不提交">⚡ 极速探测 id</button>
        </div>
        <div class="xkh-row" style="margin-top:6px">
          <label title="默认开启。隐藏 19 列里的 14 个低价值列，只留 操作/课程名/上课时间地点/教师/已选容量，并给网课加平台标签。">
            <input type="checkbox" id="xkh-beauty"> 美化选课页
          </label>
          <label title="默认开启。每次提交自动判断：能找到页面按钮就走正常模式（点按钮）；找不到（页面没渲染出来 / 加载失败 / 网络卡住）才降级直发 POST。">
            <input type="checkbox" id="xkh-direct"> 自动降级
          </label>
        </div>
        <div class="xkh-sec" id="xkh-sec-probe" style="display:none">
          <h4>探测到的目标 id <span class="n" id="xkh-probe-n"></span></h4>
          <div id="xkh-list-probe"></div>
        </div>
        <div class="xkh-sec" id="xkh-sec-xk">
          <h4>网课清单 <span class="n" id="xkh-xk-n"></span></h4>
          <div id="xkh-list-xk"></div>
        </div>
        <div class="xkh-sec" id="xkh-sec-extra" style="display:none">
          <h4>清单外 · 疑似网课 <span class="n" id="xkh-extra-n"></span></h4>
          <div id="xkh-list-extra"></div>
        </div>
        <div class="xkh-sec" id="xkh-sec-sz">
          <h4>思政课目标 <span class="n" id="xkh-sz-n"></span></h4>
          <div id="xkh-list-sz"></div>
        </div>
        <div class="xkh-log" id="xkh-log"></div>
      </div>`;
    document.body.appendChild(p);

    const mini = document.createElement('button');
    mini.id = 'xkh-toggle';
    mini.innerHTML = '选<span class="badge"></span>';
    mini.title = '展开选课助手';
    document.body.appendChild(mini);

    // 选课页默认展开；用户手动收起过就记住选择
    let collapsed = false;
    try { const s = localStorage.getItem('xkh_collapsed'); if (s !== null) collapsed = (s === '1'); } catch (e) {}
    function setCollapsed(v) {
      collapsed = v;
      p.style.display = v ? 'none' : '';
      mini.style.display = v ? 'block' : 'none';
      try { localStorage.setItem('xkh_collapsed', v ? '1' : '0'); } catch (e) {}
    }
    document.getElementById('xkh-min').onclick = () => setCollapsed(true);
    mini.onclick = () => setCollapsed(false);
    setCollapsed(collapsed);

    document.getElementById('xkh-only').onchange = e => {
      onlyTargets = e.target.checked; applyHighlight();
      log(onlyTargets ? '已开启「只看目标」' : '已关闭「只看目标」');
    };
    document.getElementById('xkh-hitonly').onchange = e => {
      showOnlyHit = e.target.checked; renderLists();
    };

    // 分类下拉：筛选面板列表；选具体分类时顺带把页面也切过去
    document.getElementById('xkh-cat').onchange = e => {
      bFilterOwner = e.target.value;
      catFilter = bFilterOwner;              // 与美化栏共用同一个状态
      // flat 模式下系统页签已隐藏，不需要也不应该切页签（切了会触发请求）
      if (bFilterOwner && !document.body.classList.contains('xkh-flat')) {
        const c = allCategories().find(x => x.name === bFilterOwner);
        if (c) { switchCategory(c.pcid); log('已切换到「' + bFilterOwner + '」分类'); }
      }
      syncPanelToOwner();
      applyRowVisibility();
      renderLists();
    };

    // 刷新当前分类：重新拉一次当前显示分类的课程数据（网络卡顿时用）
    document.getElementById('xkh-refresh-cat').onclick = () => {
      const pcid = activeCategory();
      if (!pcid) { log('读不到当前分类，跳过'); return; }
      refreshCategory(pcid, categoryName(pcid));
    };

    document.getElementById('xkh-retry').onclick = () => retryEmpty(RETRY_MAX_ROUNDS);
    document.getElementById('xkh-probe').onclick = () => {
      const btn = document.getElementById('xkh-probe');
      btn.disabled = true; btn.textContent = '探测中…';
      fastProbe().finally(() => {
        btn.disabled = false; btn.textContent = '⚡ 极速探测 id';
      });
    };
    const chkDirect = document.getElementById('xkh-direct');
    if (chkDirect) {
      chkDirect.checked = allowDirectPost;
      chkDirect.onchange = e => {
        allowDirectPost = e.target.checked;
        try { localStorage.setItem('xkh_direct_post', allowDirectPost ? '1' : '0'); } catch (err) {}
        log(allowDirectPost
          ? '已开启「自动降级」—— 页面按钮可用时走正常模式，不可用时直发 POST'
          : '已关闭「自动降级」—— 页面按钮不可用时将拒绝提交');
      };
    }

    const chkBeauty = document.getElementById('xkh-beauty');
    if (chkBeauty) {
      chkBeauty.checked = beautifyOn;
      chkBeauty.onchange = e => {
        beautifyOn = e.target.checked;
        try { localStorage.setItem('xkh_beautify', beautifyOn ? '1' : '0'); } catch (err) {}
        applyBeautify();
        log(beautifyOn ? '已开启「美化选课页」—— 隐藏 14 个低价值列，网课加平台标签'
                       : '已关闭「美化选课页」—— 恢复原始表格');
      };
    }
    document.getElementById('xkh-go-online').onclick = () => {
      // 顺序：指定优先课程(教育学) → 学习通 → 长江雨课堂 → 知到 → NeoSchool
      if (!jumpToFirstOnline(null)) log('页面上没找到清单内的网课，可先点「刷新当前分类」');
    };
    document.getElementById('xkh-go-first').onclick = () => {
      const rows = scanRows();
      const first = pickFirst(rows);
      if (!first) { log('当前没有可跳转的目标'); return; }
      if (SZ_CODES.has(first.code)) jumpTo(first.code, true);
      else jumpTo(baseName(rowName(first.tr)), false);
    };
    document.getElementById('xkh-drop').onclick = () => {
      const list = getDropActions();
      if (!list.length) { log('页面上没找到退课按钮 —— 「已选课程」可能还没加载或需要切页签'); return; }
      log('已选课程 ' + list.length + ' 门：' + list.map(x => describeRow(x.tr).name).join('、'));
      submitDrop(list[0]);
    };

    document.getElementById('xkh-q').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = e.target.value.trim(); if (!q) return;
      const rows = scanRows();
      let hit = rows.find(r => r.code === q);
      if (!hit) hit = rows.find(r => rowName(r.tr).indexOf(q) >= 0);
      if (hit) { jumpTo(hit.code, true); return; }
      const o = ONLINE_BY_NAME[normName(q)];
      if (o) { if (!jumpTo(o.name, false)) log('清单里有「' + o.name + '」，但页面上没加载出来'); }
      else log('没找到匹配「' + q + '」的教学班');
    });

    (function () {
      const head = document.getElementById('xkh-head');
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
      head.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true;
        const r = p.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        p.style.left = ox + 'px'; p.style.top = oy + 'px';
        p.style.right = 'auto'; p.style.bottom = 'auto';
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        p.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
        p.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; });
    })();

    log('选课助手已加载：网课清单 ' + ONLINE_XK.length + ' 门，思政课目标 ' + TARGETS_SZ.length + ' 个');
  }

  function appCls(pri) { return 'xkh-badge-app p' + (pri <= 4 ? pri : 4); }

  /** 某个清单条目的分类：优先用页面上实际的分类名，没有就用清单里的 */
  function onlineCategory(o, row) {
    if (row) {
      const pcid = rowCategory(row.tr);
      if (pcid) return categoryName(pcid);
    }
    return o.cat || '';
  }

  function refreshCategoryOptions() {
    const sel = document.getElementById('xkh-cat');
    if (!sel) return;
    const cats = allCategories();
    const cur = catFilter;
    sel.innerHTML = '<option value="">全部分类</option>' +
      cats.map(c => '<option value="' + c.name + '">' + c.name + '</option>').join('');
    sel.value = cats.some(c => c.name === cur) ? cur : '';
    if (sel.value !== cur) { catFilter = sel.value; bFilterOwner = sel.value; }
  }

  function renderLists() {
    const rows = scanRows();
    const onHit = {}, szHit = {};
    rows.forEach(r => {
      const o = matchOnline(r.tr); if (o) onHit[o.name] = r;
      const s = matchSz(r); if (s) szHit[s.code] = r;
    });

    refreshCategoryOptions();

    // ---------- 网课清单 ----------
    let list = ONLINE_XK.map(o => ({ o: o, r: onHit[o.name] || null }));
    if (showOnlyHit) list = list.filter(x => x.r);
    if (catFilter) list = list.filter(x => onlineCategory(x.o, x.r) === catFilter);

    document.getElementById('xkh-xk-n').textContent =
      '命中 ' + Object.keys(onHit).length + '/' + ONLINE_XK.length + ' 门' +
      (catFilter ? '（筛选中）' : '');
    document.getElementById('xkh-list-xk').innerHTML = list.map(({ o, r }) => {
      const st = r ? rowState(r.tr) : 'miss';
      const cls = ['xkh-item'];
      if (o.pin === 0) cls.push('xkh-pin');
      if (!r) cls.push('xkh-miss');
      if (st === 'selected') cls.push('xkh-selected');
      if (st === 'full') cls.push('xkh-full');
      const tags = (o.pin === 0 ? '<span class="xkh-badge xkh-badge-pin">优先抢</span>' : '') +
                   '<span class="xkh-badge ' + appCls(o.pri) + '">' + o.app + '</span>' +
                   '<span class="xkh-badge xkh-badge-app">' + onlineCategory(o, r) + '</span>';
      const canGo = canSubmit(st, o.name, false);
      const tip = submitTip(st, !!r, o.name, false);
      return '<div class="' + cls.join(' ') + '" data-name="' + o.name + '" title="' + tip + '">' +
        '<span class="rk">' + (o.pin === 0 ? '★' : o.pri) + '</span>' +
        '<span class="nm">' + o.name + tags + '</span>' +
        '<button class="go" data-name="' + o.name + '" title="' + tip + '"' + (canGo ? '' : ' disabled') + '>选</button></div>';
    }).join('') || '<div style="padding:6px;color:#8a94a3;font-size:12px">（没有符合条件的网课）</div>';

    // ---------- 清单外 · 疑似网课 ----------
    // 规则：不在网课清单、也不是思政目标，但 教师=网络线上教学 或 时间地点=--/--
    const extraMap = {};
    rows.forEach(r => {
      if (matchOnline(r.tr)) return;
      if (matchSz(r)) return;
      if (!looksOnline(r.tr)) return;
      const nm = baseName(rowName(r.tr));
      if (!nm) return;
      if (!extraMap[nm]) extraMap[nm] = r;
    });
    let extras = Object.keys(extraMap).map(nm => ({ name: nm, r: extraMap[nm] }));
    if (catFilter) extras = extras.filter(x => categoryName(rowCategory(x.r.tr)) === catFilter);

    const secExtra = document.getElementById('xkh-sec-extra');
    if (secExtra) secExtra.style.display = extras.length ? '' : 'none';
    document.getElementById('xkh-extra-n').textContent =
      extras.length + ' 门（教师=网络线上教学 或 时间地点=--/--）';
    document.getElementById('xkh-list-extra').innerHTML = extras.map(x => {
      const st = rowState(x.r.tr);
      const cls = ['xkh-item'];
      if (st === 'selected') cls.push('xkh-selected');
      if (st === 'full') cls.push('xkh-full');
      const canGo = canSubmit(st, x.name, false);
      const cat = categoryName(rowCategory(x.r.tr));
      const tip = submitTip(st, true, x.name, false);
      return '<div class="' + cls.join(' ') + '" data-extra="' + x.name + '" title="' + tip + '">' +
        '<span class="rk">?</span>' +
        '<span class="nm">' + x.name +
        '<span class="xkh-badge xkh-badge-app">清单外</span>' +
        '<span class="xkh-badge xkh-badge-app">' + cat + '</span></span>' +
        '<button class="go" data-extra="' + x.name + '" title="' + tip + '"' + (canGo ? '' : ' disabled') + '>选</button></div>';
    }).join('');

    // ---------- 思政课目标 ----------
    let slist = TARGETS_SZ.slice().sort((a, b) => a.rank - b.rank);
    if (showOnlyHit) slist = slist.filter(t => szHit[t.code]);
    document.getElementById('xkh-sz-n').textContent =
      '命中 ' + Object.keys(szHit).length + '/' + TARGETS_SZ.length + ' 个';
    document.getElementById('xkh-list-sz').innerHTML = slist.map(t => {
      const r = szHit[t.code];
      const st = r ? rowState(r.tr) : 'miss';
      const cls = ['xkh-item'];
      if (t.rank === 1) cls.push('xkh-pin');          // 第一顺位高亮
      if (!r) cls.push('xkh-miss');
      if (st === 'selected') cls.push('xkh-selected');
      if (st === 'full') cls.push('xkh-full');
      const canGo = canSubmit(st, t.code, true);
      const tip = !r ? '这一行还没加载出来'
                 : st === 'selected' ? '你已经选上这门课了（页面表头显示「已选」）'
                 : st === 'full' ? '已满，但仍可尝试提交（可能有人退课腾出名额）'
                 : '提交选课（会弹确认框）';
      // 徽章：第一顺位 / 网课 / 已选
      const badges =
        (t.rank === 1 ? '<span class="xkh-badge xkh-badge-pin">优先</span>' : '') +
        (/网课/.test(t.tier || '') ? '<span class="xkh-badge xkh-badge-online">网课</span>' : '') +
        (st === 'selected' ? '<span class="xkh-badge xkh-badge-done">已选</span>' : '') +
        (st === 'full' && st !== 'selected' ? '<span class="xkh-badge xkh-badge-full">已满</span>' : '');
      return '<div class="' + cls.join(' ') + '" data-code="' + t.code + '" title="' + t.tier + ' · 容量 ' + t.size + '">' +
        '<span class="rk">' + (t.rank === 1 ? '★' : t.rank) + '</span>' +
        '<span class="nm">' + t.name + badges + '</span>' +
        '<span class="cd">' + t.code + '</span>' +
        '<button class="go" data-code="' + t.code + '" title="' + tip + '"' + (canGo ? '' : ' disabled') + '>选</button></div>';
    }).join('') || '<div style="padding:6px;color:#8a94a3;font-size:12px">（当前页面没有思政课目标）</div>';

    // ---------- 绑定 ----------
    document.querySelectorAll('#xkh-list-xk .xkh-item').forEach(el => {
      el.onclick = () => jumpTo(el.dataset.name, false);
    });
    document.querySelectorAll('#xkh-list-xk button.go').forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); submitSelect(b.dataset.name, false); };
    });
    document.querySelectorAll('#xkh-list-extra .xkh-item').forEach(el => {
      el.onclick = () => jumpTo(el.dataset.extra, false);
    });
    document.querySelectorAll('#xkh-list-extra button.go').forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); submitSelect(b.dataset.extra, false); };
    });
    document.querySelectorAll('#xkh-list-sz .xkh-item').forEach(el => {
      el.onclick = () => jumpTo(el.dataset.code, true);
    });
    document.querySelectorAll('#xkh-list-sz button.go').forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); submitSelect(b.dataset.code, true); };
    });
  }

  function updatePanel(rowCount, foundSz, foundOn) {
    batch = detectBatch();
    const mode = document.getElementById('xkh-mode');
    if (mode) {
      mode.innerHTML = '当前批次：<b>' + BATCH_LABEL[batch] + '</b>' +
        (batch === 'xk' ? '（网课清单 ' + ONLINE_XK.length + ' 门）'
         : batch === 'sz' ? '（目标 ' + TARGETS_SZ.length + ' 个教学班）' : '');
    }
    const hit = batch === 'sz' ? foundSz.size : foundOn.size;
    const total = batch === 'sz' ? TARGETS_SZ.length : ONLINE_XK.length;
    const stat = document.getElementById('xkh-stat');
    if (stat) {
      // 提交模式指示：页面按钮可用 = 正常模式；否则会降级直发
      const all = scanRows();
      const withBtn = all.filter(r => getSelectAction(r.tr)).length;
      const mode = all.length === 0 ? '页面未加载 → 降级直发'
                 : withBtn === 0 ? '页面异常 → 降级直发'
                 : '正常 → 点页面按钮';
      stat.textContent = '页面上共 ' + rowCount + ' 个教学班，命中目标 ' + hit + '/' + total +
                         '　|　提交模式：' + (allowDirectPost ? mode : '仅正常模式');
    }

    const mini = document.getElementById('xkh-toggle');
    if (mini) {
      mini.classList.toggle('has-hit', hit > 0);
      const b = mini.querySelector('.badge');
      if (b) b.textContent = hit;
      if (hit > 0) mini.title = '发现 ' + hit + ' 个目标，点开查看';
      if (AUTO_EXPAND_WHEN_HIT && hit > 0 && !autoExpanded) {
        autoExpanded = true;
        if (mini.style.display !== 'none') mini.click();
      }
    }
    renderLists();
  }

  /* ============================================================
   *  启动
   * ============================================================ */

  function isCoursePage() {
    const p = location.pathname;
    if (/xkPage/.test(p)) return true;
    if (/xsd\/xkgl/.test(p)) return true;
    if (/indexMain/.test(p)) return false;
    return !!(document.querySelector('#adminPath') && document.querySelector('#kcgs'));
  }

  function boot() {
    if (document.getElementById('xkh-panel')) return;
    if (!isCoursePage()) return;
    buildPanel();
    let timer = null;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applyHighlight, 300);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    applyHighlight();
    // 窗口尺寸变化时重算列数与容器宽度
    window.addEventListener('resize', () => { applyColumnLayout(); });
    // 隐藏的分类容器量不到宽度（clientWidth=0），切过去时才需要重算。
    // ResizeObserver 在容器由隐藏变可见时会触发，正好补上这一环。
    try {
      const ro = new ResizeObserver(() => applyColumnLayout());
      document.querySelectorAll('[id^="xkgz_content_"]').forEach(c => ro.observe(c));
    } catch (e) {}
    // 兜底：点分类页签后也重算一次
    const tabUl = document.getElementById('myTab');
    if (tabUl) tabUl.addEventListener('click', () => setTimeout(applyColumnLayout, 350));
    // 一页展示全部：先把还没加载的分类各拉一次（每个只拉一次），之后切换不再请求
    setTimeout(() => { ensureAllLoaded().then(() => applyHighlight()); }, 2500);
    setTimeout(() => {
      const empties = emptyCategories();
      if (empties.length) { log('检测到 ' + empties.length + ' 个分类为空，开始自动重试'); retryEmpty(RETRY_MAX_ROUNDS); }
      else log('首屏加载正常，无需重试');
    }, RETRY_START_DELAY_MS);
  }

  function start() {
    boot();
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      boot();
      if (tries > 60 || document.getElementById('xkh-panel')) clearInterval(t);
    }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
