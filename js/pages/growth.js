/**
 * growth.js — 个人提升（日常表达 / 职场表达 / 面试技巧 / 新闻话题）
 * 每日按日期种子轮换 10 条沟通技巧卡片；支持收藏 + 关键词搜索。
 */
import { Store, formatDate, escapeHtml } from '../store.js';

let growthTab = 'daily'; // daily | work | interview | news

export const GrowthPage = {
  render(container) {
    container.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${growthTab==='daily'?'active':''}" data-gt="daily">💬 日常表达</button>
        <button class="sub-tab ${growthTab==='work'?'active':''}" data-gt="work">💼 职场表达</button>
        <button class="sub-tab ${growthTab==='interview'?'active':''}" data-gt="interview">🎓 面试技巧</button>
        <button class="sub-tab ${growthTab==='news'?'active':''}" data-gt="news">📰 新闻话题</button>
      </div>
      <div id="growthContent"></div>
    `;
    container.querySelectorAll('.sub-tab[data-gt]').forEach(t => t.addEventListener('click', () => { growthTab = t.dataset.gt; GrowthPage.render(container); }));
    const content = document.getElementById('growthContent');
    if (growthTab === 'daily') renderDaily(content);
    else if (growthTab === 'work') renderWork(content);
    else if (growthTab === 'interview') renderInterview(content);
    else renderNews(content);
  }
};

// ========== 内容库 ==========
const GROWTH_LIB = {
  daily: {
    '高情商聊天': [
      { title: '把"你错了"换成"我理解你的角度"', method: '先共情再表达，避免让对方进入防御状态。用"我理解…不过我还有个补充"的句式，既保留立场又不伤关系。', case: '同事坚持方案 A，你觉得 B 更好：「我理解你想尽快上线，这很合理；不过我担心数据没验证，咱们要不要先小范围测一下？」' },
      { title: '用提问代替说教', method: '想影响别人时，先用开放式提问让他自己得出结论，比直接给结论更让人接受。', case: '朋友犹豫要不要换工作：「你现在最在意的是薪资还是成长？如果两年后回头看，你希望自己在哪？」' },
      { title: '接话不冷场：复述+延展', method: '对方说完，复述关键词并抛一个相关小问题，对话自然延续。', case: '「你刚说项目延期了——是卡在供应商还是内部排期？后面打算怎么赶？」' },
      { title: '夸具体，不夸空', method: '赞美要落到细节和行为，而非「你真棒」这种笼统词，对方才觉得真诚。', case: '「你刚才那段汇报把风险讲得特别清楚，尤其是把第三季度的不确定性提前点出来了，很有说服力。」' },
      { title: '情绪当下先接住', method: '对方发脾气时，先承认情绪再处理事：「我看出来你现在很着急」，能迅速降火。', case: '客户怒吼交付慢：「换我我也急，这批货晚一天对我影响很大——我们先把最紧急的先发走。」' },
      { title: '留白比抢话高级', method: '说完关键句后停顿 1-2 秒，给对方思考和接话空间，也显得你从容。', case: '谈完条件后闭口等对方先开口，往往能拿到更好回应。' }
    ],
    '拒绝话术': [
      { title: '拒绝事，不拒绝人', method: '用"肯定关系+设边界+给替代"三段式，拒绝请求但不伤感情。', case: '「这事交给我你放心，不过这周实在排满了；下周二我空，或者你问下小李他手头松。」' },
      { title: '"我需要看一下日历"缓冲法', method: '不立刻答应也不立刻拒绝，争取思考时间：「我先核对下排期，晚点回你。」', case: '临时加活：「我先确认下今天的两个会议，半小时内给你准信。」' },
      { title: '用原则挡，而非用情绪挡', method: '把拒绝归因于既定规则/优先级，而非"我不想帮"。', case: '「公司规定报销要事前审批，这次确实走不了，下次提前一天找我帮你把关。」' },
      { title: '降维答应法', method: '不能完全帮时，给一个更小的可行版本，既体面又可控。', case: '「整份我来做不来，但我可以帮你列个提纲/改个开头。」' },
      { title: '重复请求时温和坚定', method: '对方二次施压，重复你的边界并加一句感谢，不解释过多显得心虚。', case: '「我理解很急，但我这边确实抽不出身了，抱歉帮不上。」' }
    ],
    '化解尴尬': [
      { title: '自嘲是最快解药', method: '自己出糗时主动调侃，气氛立刻松下来，别人反而不好意思笑你。', case: '说错名字：「看我这张嘴，刚把人家叫成前同事了，该罚我请奶茶。」' },
      { title: '把焦点转回对方', method: '冷场或出错时，抛一个关于对方的问题，把注意力移开。', case: '聚餐冷场：「对了，你上次说的那个展览去了没？怎么样？」' },
      { title: '用"我也常这样"共情', method: '别人尴尬时，分享一个自己的同类小糗事，让他不孤单。', case: '对方忘词：「没事，我上次汇报直接把PPT翻过去了，后来才想起来。」' },
      { title: '正事破尴尬', method: '社交卡顿时，直接切到一个具体的正经话题或行动指令。', case: '「对了，咱们先把下周的分工定一下？」' }
    ],
    '赞美技巧': [
      { title: '行为级赞美最可信', method: '夸"你做了什么"而非"你是什么"，具体且难以反驳。', case: '「你整理的那张表，配色和分类让我一眼就找到数据，省了我半小时。」' },
      { title: '借第三方之口', method: '「听XX说你那事办得漂亮」比直接夸更有权威感。', case: '「老板昨天还夸你那版方案逻辑清楚。」' },
      { title: '进步式赞美', method: '夸对方"比上次更好"，体现你一直在关注，激励感强。', case: '「你这次发言比上月稳多了，节奏把握得特别好。」' },
      { title: '公开场合点名夸', method: '在群里/会上点名表扬，价值翻倍，但务必真实。', case: '周会：「这周的复盘文档是小王做的，大家可以直接拿来当模板。」' }
    ]
  },
  work: {
    '工作汇报': [
      { title: '结论先行（BLUF）', method: '汇报第一句给结果，再讲依据。领导最缺的是结论，不是过程。', case: '「本月销售达标 108%，超 8 个点；主要拉动力是华东新客，下面三页是拆解。」' },
      { title: '用"问题-动作-结果"结构', method: '每件事按 遇到什么、做了什么、产出什么 三句讲完，干净利落。', case: '「库存异常（问题）→ 拉了三个月流水比对（动作）→ 定位到一笔重复入库，已追回 2.3 万（结果）。」' },
      { title: '数据带单位+对比', method: '数字必须配同比/环比/目标，孤立的数字没有信息量。', case: '「成本下降 12 万」改成「成本 88 万，环比 -12%，低于季度目标 95 万」。' },
      { title: '先讲风险再讲成绩', method: '汇报结尾补一句风险与所需支持，显得你有全局观。', case: '「成绩之外，下月供应商账期可能收紧，需要财务提前备 50 万头寸，请批示。」' }
    ],
    '会议发言': [
      { title: '发言前先点题', method: '「我想补充三点关于排期的风险」比「我说两句」更让人聚焦。', case: '「针对刚才的上线时间，我从测试资源角度补充两点。」' },
      { title: '异议要对事不对人', method: '用"这个方案在X条件下可能有隐患"代替"这个方案不行"。', case: '「我担心灰度比例 5% 在高峰时段不够，要不要先 1% 观察一小时？」' },
      { title: '承接上一位再开口', method: '「我接着刚才XX说的…」让发言有连贯性，显得你在听。', case: '「我接着小李说的成本问题，补充一个采购侧的办法。」' },
      { title: '收尾给Action', method: '发言结束抛一个明确的下一步或负责人，会议才落地。', case: '「那这事就先由我出初稿，周五前发群里大家看？」' }
    ],
    '跨部门沟通': [
      { title: '用对方KPI说话', method: '提需求时绑定对方部门的目标，协作意愿立刻不同。', case: '找运营帮忙：「这次联动能帮你那块留存指标冲一波，素材我全包。」' },
      { title: '把"麻烦你"换成"一起达成"', method: '从"我求你办事"转为"我们共同目标"，关系更对等。', case: '「这单客户很急，咱们两边对一下节点，确保周四能交。」' },
      { title: '留邮件/文档痕迹', method: '跨部门关键约定落到文字，避免扯皮，也显专业。', case: '「刚电话说的口径我整理成这条，你确认下没问题我就往下推。」' },
      { title: '先建交情再办事', method: '平时多点线下互动，关键时刻协调才顺。', case: '非紧急时也顺手帮对方一个小忙，攒下人情账户。' }
    ],
    '职场礼仪': [
      { title: '微信先自报家门', method: '加陌生同事/外部，第一句写清"我是谁+找你什么事"。', case: '「您好，我是财务部小王，想跟您核对下这笔报销的发票，方便吗？」' },
      { title: '发文件带一句话摘要', method: '扔个文件链接前，先说这是什么、要对方做什么。', case: '「这是Q3预算初稿，麻烦您重点看第4页的推广费用，周五前反馈就行。」' },
      { title: '收到必回"收到"', method: '群里@你或布置任务，先回"收到"再处理，是最低成本的靠谱感。', case: '「收到，我下午三点前给您初版。」' },
      { title: '道歉具体不甩锅', method: '出错时先认责+补救，比解释原因更得信任。', case: '「是我漏发了通知，已补发并私信了没看到的五位，后续我加个发送清单核对。」' }
    ]
  },
  interview: [
    { title: '请简述增值税一般纳税人与小规模纳税人的区别', method: '从认定标准、税率、进项抵扣、申报方式四个维度答，体现体系化。', case: '「认定上按年销售额 500 万划分；一般纳税人适用 13%/9%/6% 税率且可抵扣进项，小规模用征收率 3%（现优惠 1%）且不能抵扣；申报上一般按月、小规模可按季。实务中客户多为一般纳税人的，选一般纳税人更划算。」' },
    { title: '企业所得税常见纳税调整项有哪些', method: '按"限额扣除/不得扣除/免税收入"归类，举 3-4 个高频例子。', case: '「业务招待费按发生额 60% 且不超过营收 5‰ 扣除；广宣费不超营收 15% 可结转；福利费 14%、工会 2%、职教 8%；罚款滞纳金不得扣除；国债利息等免税。我做年报时先拉这些明细逐项调。」' },
    { title: '控制测试与实质性程序的区别', method: '一句话讲清"测流程"vs"测金额"，再讲两者关系。', case: '「控制测试评价内控是否有效运行，实质性程序直接查交易金额是否对错。内控可信时减少实质性程序（依赖控制），不可信则全面实质性。我们年审先穿行测试再定抽样量。」' },
    { title: '存货监盘你具体怎么做', method: '讲计划、现场、抽盘、差异处理四步，突出实操。', case: '「提前发监盘计划与盘点表；现场观察是否停线、是否认真点数；我抽盘 30% 高频品类并双向核对；差异写进备忘录，盘亏查明是损耗还是舞弊，调账并与管理层确认。」' },
    { title: '三大财务报表的关系', method: '用"权责发生制串联"一句话点透勾稽。', case: '「利润表净利润经留存收益进资产负债表权益；现金流量表起点是净利润，调应收应付折旧得出现金。三张表通过未分配利润和现金科目勾稽，不平一定哪错了。」' },
    { title: '如何应对审计抽凭被客户拖延', method: '展现项目管理和沟通力，而非硬刚。', case: '「我会提前给凭证清单并设 Deadline，每天晨会同步进度；若仍拖延，升级跟项目经理和客户财务总监对齐优先级，必要时调减其他程序保关键领域，并在底稿留痕。」' },
    { title: '为什么选择税务/审计这一行', method: '把个人特质与职业价值结合，避免空话"稳定"。', case: '「我细扣数字有成就感，也喜欢帮企业把税筹合规落地——既守住红线又真省钱。实习里帮一家小厂理清研发费用加计扣除，退了 4 万，那种反馈让我确定走这行。」' },
    { title: '发现自己之前报的税算错了怎么办', method: '体现合规意识与主动性，不掩盖。', case: '「先自查影响金额与所属期，主动和主管说明并补申报补缴滞纳金，避免稽查罚款；同时复盘出错环节，加一道交叉复核，把流程漏洞补上。诚信比一次失误重要。」' },
    { title: '金税四期下企业要注意什么', method: '讲"以数治税"和几类高危信号。', case: '「四期打通银行、社保、发票数据，重点盯：公私账混用、进销项严重不匹配、长期零申报、个税与社保基数差异大。建议企业规范进项、分离公私账户、按时申报，别碰虚开发票红线。」' },
    { title: '财务岗如何向业务要数据', method: '展现业财融合思维。', case: '「我不等业务报，而是先告诉他们我要什么口径、为什么，比如算毛利按不含税口径；建个共享表自动取数，每月只核对异常项，既准又省沟通成本。」' },
    { title: '你最大的缺点是什么', method: '讲真实但可改进、且不与岗位核心冲突的缺点。', case: '「我前期太追求把每张表做到完美，导致有时赶不上节点。现在我用 80/20——先出准版再迭代，并给每项设 Deadline，效率明显好了。」' },
    { title: '折旧方法有哪些，怎么选', method: '列举并讲税务与会计差异。', case: '「直线法、工作量法、双倍余额递减、年数总和。会计可自选，但税法一般认可直线法，加速折旧有优惠备案。选时看资产消耗 pattern，设备用加速更匹配收入，也节前期税。」' },
    { title: '应收账款坏账怎么处理', method: '讲备抵法与新准则预期信用损失。', case: '「现在用预期信用损失模型，按账龄和客群计提坏账准备，计入信用减值损失；核销走备抵不影响当期利润。我每月跑账龄分析，超 1 年重点催收并提足。」' },
    { title: '你期望的薪资是多少', method: '不先亮底牌，给区间并绑定价值。', case: '「我了解这个岗位市场区间大概在 X-Y，具体看职责和成长空间。我更看重前两年能独立做项目、有 mentor，薪资在合理区间即可，相信做得好会有对应回报。」' },
    { title: '现金流为负但利润为正说明什么', method: '点出"赚到账面钱但没回款"。', case: '「典型是收入多为赊销、存货或应收堆着。要看应收周转和回款政策，警惕"纸面富贵"。我会拉应收账龄和经营性现金流出，判断是季节性还是客户恶化。」' },
    { title: '年末审计最怕什么坑', method: '讲高风险领域与应对，显经验。', case: '「最怕收入截止性（是否提前确认）、关联方交易隐匿、存货跌价计提不足。我会重点做截止测试、查关联方往来、跑存货跌价模型，并留足工作底稿。」' }
  ],
};

const NEWS_FALLBACK = { date: "2026-08-13", sections: [
  { name: '抖音热议', icon: '🔥', items: [
    { title: "朱镕基同志逝世", link: "https://www.douyin.com/search/%E6%9C%B1%E9%95%95%E5%9F%BA%E5%90%8C%E5%BF%97%E9%80%9D%E4%B8%96", hot: 12155642 },
    { title: "新台风浪卡生成", link: "https://www.douyin.com/search/%E6%96%B0%E5%8F%B0%E9%A3%8E%E6%B5%AA%E5%8D%A1%E7%94%9F%E6%88%90", hot: 10878303 },
    { title: "我国加快自然资源一张图建设", link: "https://www.douyin.com/search/%E6%88%91%E5%9B%BD%E5%8A%A0%E5%BF%AB%E8%87%AA%E7%84%B6%E8%B5%84%E6%BA%90%E4%B8%80%E5%BC%A0%E5%9B%BE%E5%BB%BA%E8%AE%BE", hot: 10841798 },
    { title: "威少宣布退役", link: "https://www.douyin.com/search/%E5%A8%81%E5%B0%91%E5%AE%A3%E5%B8%83%E9%80%80%E5%BD%B9", hot: 10772663 },
    { title: "白海豚给河南下的雨有多大", link: "https://www.douyin.com/search/%E7%99%BD%E6%B5%B7%E8%B1%9A%E7%BB%99%E6%B2%B3%E5%8D%97%E4%B8%8B%E7%9A%84%E9%9B%A8%E6%9C%89%E5%A4%9A%E5%A4%A7", hot: 10182202 },
    { title: "看看我拍到的英仙座流星雨吧", link: "https://www.douyin.com/search/%E7%9C%8B%E7%9C%8B%E6%88%91%E6%8B%8D%E5%88%B0%E7%9A%84%E8%8B%B1%E4%BB%99%E5%BA%A7%E6%B5%81%E6%98%9F%E9%9B%A8%E5%90%A7", hot: 10026962 },
    { title: "第一批拍流星雨的摄影师已出片", link: "https://www.douyin.com/search/%E7%AC%AC%E4%B8%80%E6%89%B9%E6%8B%8D%E6%B5%81%E6%98%9F%E9%9B%A8%E7%9A%84%E6%91%84%E5%BD%B1%E5%B8%88%E5%B7%B2%E5%87%BA%E7%89%87", hot: 8791718 },
    { title: "我选择海岛作为我生活的解药", link: "https://www.douyin.com/search/%E6%88%91%E9%80%89%E6%8B%A9%E6%B5%B7%E5%B2%9B%E4%BD%9C%E4%B8%BA%E6%88%91%E7%94%9F%E6%B4%BB%E7%9A%84%E8%A7%A3%E8%8D%AF", hot: 8563408 },
    { title: "一条视频了解英仙座流星雨", link: "https://www.douyin.com/search/%E4%B8%80%E6%9D%A1%E8%A7%86%E9%A2%91%E4%BA%86%E8%A7%A3%E8%8B%B1%E4%BB%99%E5%BA%A7%E6%B5%81%E6%98%9F%E9%9B%A8", hot: 8405293 },
    { title: "硬核运镜闯8D重庆太丝滑了", link: "https://www.douyin.com/search/%E7%A1%AC%E6%A0%B8%E8%BF%90%E9%95%9C%E9%97%AF8D%E9%87%8D%E5%BA%86%E5%A4%AA%E4%B8%9D%E6%BB%91%E4%BA%86", hot: 7828816 },
    { title: "穿搭改变环境", link: "https://www.douyin.com/search/%E7%A9%BF%E6%90%AD%E6%94%B9%E5%8F%98%E7%8E%AF%E5%A2%83", hot: 7744106 },
    { title: "伦纳德百分大战定档", link: "https://www.douyin.com/search/%E4%BC%A6%E7%BA%B3%E5%BE%B7%E7%99%BE%E5%88%86%E5%A4%A7%E6%88%98%E5%AE%9A%E6%A1%A3", hot: 7742803 },
  ] },
  { name: '微博热搜', icon: '🔥', items: [
    { title: "朱镕基同志逝世", link: "https://s.weibo.com/weibo?q=%E6%9C%B1%E9%95%95%E5%9F%BA%E5%90%8C%E5%BF%97%E9%80%9D%E4%B8%96", hot: 1041761 },
    { title: "胖东来许昌老店关闭周边商户发声", link: "https://s.weibo.com/weibo?q=%E8%83%96%E4%B8%9C%E6%9D%A5%E8%AE%B8%E6%98%8C%E8%80%81%E5%BA%97%E5%85%B3%E9%97%AD%E5%91%A8%E8%BE%B9%E5%95%86%E6%88%B7%E5%8F%91%E5%A3%B0", hot: 989931 },
    { title: "60万亿元消费蓝海要来了", link: "https://s.weibo.com/weibo?q=60%E4%B8%87%E4%BA%BF%E5%85%83%E6%B6%88%E8%B4%B9%E8%93%9D%E6%B5%B7%E8%A6%81%E6%9D%A5%E4%BA%86", hot: 926325 },
    { title: "比Lululemon还贵的瑜伽服来中国了", link: "https://s.weibo.com/weibo?q=%E6%AF%94Lululemon%E8%BF%98%E8%B4%B5%E7%9A%84%E7%91%9C%E4%BC%BD%E6%9C%8D%E6%9D%A5%E4%B8%AD%E5%9B%BD%E4%BA%86", hot: 737202 },
    { title: "男子分手十多年想要回30克金手镯", link: "https://s.weibo.com/weibo?q=%E7%94%B7%E5%AD%90%E5%88%86%E6%89%8B%E5%8D%81%E5%A4%9A%E5%B9%B4%E6%83%B3%E8%A6%81%E5%9B%9E30%E5%85%8B%E9%87%91%E6%89%8B%E9%95%AF", hot: 640674 },
    { title: "魏如萱称歌手丑八怪是节目组选的", link: "https://s.weibo.com/weibo?q=%E9%AD%8F%E5%A6%82%E8%90%B1%E7%A7%B0%E6%AD%8C%E6%89%8B%E4%B8%91%E5%85%AB%E6%80%AA%E6%98%AF%E8%8A%82%E7%9B%AE%E7%BB%84%E9%80%89%E7%9A%84", hot: 622768 },
    { title: "威少拒绝国王奇才报价仍选择退役", link: "https://s.weibo.com/weibo?q=%E5%A8%81%E5%B0%91%E6%8B%92%E7%BB%9D%E5%9B%BD%E7%8E%8B%E5%A5%87%E6%89%8D%E6%8A%A5%E4%BB%B7%E4%BB%8D%E9%80%89%E6%8B%A9%E9%80%80%E5%BD%B9", hot: 616184 },
    { title: "上半年全国离婚登记138.3万对", link: "https://s.weibo.com/weibo?q=%E4%B8%8A%E5%8D%8A%E5%B9%B4%E5%85%A8%E5%9B%BD%E7%A6%BB%E5%A9%9A%E7%99%BB%E8%AE%B0138.3%E4%B8%87%E5%AF%B9", hot: 577980 },
    { title: "金价油价全涨了", link: "https://s.weibo.com/weibo?q=%E9%87%91%E4%BB%B7%E6%B2%B9%E4%BB%B7%E5%85%A8%E6%B6%A8%E4%BA%86", hot: 564273 },
    { title: "龙餐馆", link: "https://s.weibo.com/weibo?q=%E9%BE%99%E9%A4%90%E9%A6%86", hot: 557149 },
    { title: "作家李娟10年没见妈妈了", link: "https://s.weibo.com/weibo?q=%E4%BD%9C%E5%AE%B6%E6%9D%8E%E5%A8%9F10%E5%B9%B4%E6%B2%A1%E8%A7%81%E5%A6%88%E5%A6%88%E4%BA%86", hot: 550347 },
    { title: "麦迪娜姜潮婚礼超多新疆美食", link: "https://s.weibo.com/weibo?q=%E9%BA%A6%E8%BF%AA%E5%A8%9C%E5%A7%9C%E6%BD%AE%E5%A9%9A%E7%A4%BC%E8%B6%85%E5%A4%9A%E6%96%B0%E7%96%86%E7%BE%8E%E9%A3%9F", hot: 540143 },
  ] },
  { name: '今日要闻·财经/政务/生活', icon: '📰', items: [
    { title: "今年上半年全国结婚登记 327.5 万对，较去年同期减少 26.4 万对；离婚登记 138.3 万对，较去年同期增加 5.2 万对", link: '', hot: 0 },
    { title: "银行能办结婚证了：天津首家银行内结婚登记点启用，领证还能定制银行卡", link: '', hot: 0 },
    { title: "31 省上半年财政收入出炉：广东以 7421 亿元连续 35 年蝉联榜首；西藏以 37% 同比增速领跑", link: '', hot: 0 },
    { title: "央行：8 月 14 日、8 月 17 日至 8 月 19 日开展隔夜逆回购操作，单日不超 6000 亿元", link: '', hot: 0 },
    { title: "中汽协：7 月新能源汽车新车销量占比首超 60%；出口连续第二个月超 100 万辆", link: '', hot: 0 },
    { title: "我国成功攻克锂云母提锂多项重大技术难题，大幅提升锂回收率", link: '', hot: 0 },
    { title: "我国主导的生命科学领域国际学术期刊《Vita》纸质刊首期发布", link: '', hot: 0 },
    { title: "苏州：新就业群体台风中受伤最高可获 10000 元救助", link: '', hot: 0 },
    { title: "福建福州一事业单位工作人员 24 年未到岗，单位登《返岗通知书》，律师称连续旷工可解除聘用", link: '', hot: 0 },
    { title: "美国撤销联邦政府设备使用 TikTok 禁令，原因是 TikTok 美国业务重组后已不再构成威胁", link: '', hot: 0 },
    { title: "世界气象组织：今年全球 7 月气温为有记录以来第二高，全球海洋表面平均温度则创同期最高纪录", link: '', hot: 0 },
    { title: "澳大利亚给外卖员定最低工资：一周接单 38 小时，一年能赚 30 万元", link: '', hot: 0 },
    { title: "NBA 洛杉矶湖人队被 125 亿美元出售，创北美职业体育球队交易纪录，新老板是特朗普女婿弟弟", link: '', hot: 0 },
    { title: "美国 7 月 CPI 同比涨幅回落至 3.4%，市场对美联储 9 月加息预期降温", link: '', hot: 0 },
    { title: "特朗普发文宣称：美国完全控制着霍尔木兹海峡，伊朗对此束手无策", link: '', hot: 0 },
  ] },
] };

// ========== 工具 ==========
function dailySeed(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
function pickDaily(pool, n, seed) {
  if (pool.length <= n) return pool.slice();
  const arr = pool.slice();
  // Fisher-Yates 用种子
  let s = seed || 1;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, n);
}
function cardId(cat, sub, idx) { return `${cat}|${sub}|${idx}`; }
function favSet() { return new Set(Store.get('growthFav', [])); }
function toggleFav(id) { const f = favSet(); if (f.has(id)) f.delete(id); else f.add(id); Store.set('growthFav', [...f]); }

function cardHtml(c, id, favIds) {
  const fav = favIds.has(id);
  return `<div class="growth-card">
    <div class="growth-card-head"><div class="growth-card-title">${escapeHtml(c.title)}</div><button class="growth-fav ${fav?'active':''}" data-fav="${escapeHtml(id)}" title="收藏">${fav ? '★' : '☆'}</button></div>
    <div class="growth-card-method"><b>方法：</b>${escapeHtml(c.method)}</div>
    <div class="growth-card-case"><b>话术/案例：</b>${escapeHtml(c.case)}</div>
  </div>`;
}

function renderCardList(el, pool, cat, favIds, seed, search) {
  let list = pool;
  if (search) { const q = search.trim(); list = pool.filter(c => (c.title + c.method + c.case).includes(q)); }
  const shown = search ? list : pickDaily(pool, 10, seed);
  el.innerHTML = `
    <div class="card" style="padding:12px">
      <input class="form-input" id="growthSearch" placeholder="🔍 搜索关键词（标题/方法/话术）" value="${escapeHtml(search || '')}">
    </div>
    ${shown.length === 0 ? '<div class="empty-state"><div class="empty-state-text">没有匹配的内容</div></div>' : ''}
    <div class="growth-list">${shown.map((c) => cardHtml(c, cardId(cat, c.title, c._idx), favIds)).join('')}</div>
    ${!search ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">今日精选 10 条（按日期轮换）· 共 ${pool.length} 条可搜</div>` : ''}
  `;
  const sInput = document.getElementById('growthSearch');
  sInput.addEventListener('input', () => { const v = sInput.value; if (growthTab === 'daily') renderDaily(el, v); else if (growthTab === 'work') renderWork(el, v); else if (growthTab === 'interview') renderInterview(el, v); else renderNews(el, v); });
  el.querySelectorAll('.growth-fav').forEach(b => b.addEventListener('click', () => { toggleFav(b.dataset.fav); const f = favSet(); b.classList.toggle('active'); b.textContent = f.has(b.dataset.fav) ? '★' : '☆'; }));
}

function renderDaily(el, search) {
  const pool = [];
  Object.keys(GROWTH_LIB.daily).forEach(sub => GROWTH_LIB.daily[sub].forEach(c => pool.push({ ...c, _sub: sub, _idx: pool.length })));
  renderCardList(el, pool, 'daily', favSet(), dailySeed(formatDate(new Date())), search);
}
function renderWork(el, search) {
  const pool = [];
  Object.keys(GROWTH_LIB.work).forEach(sub => GROWTH_LIB.work[sub].forEach(c => pool.push({ ...c, _sub: sub, _idx: pool.length })));
  renderCardList(el, pool, 'work', favSet(), dailySeed(formatDate(new Date())), search);
}
function renderInterview(el, search) {
  const pool = GROWTH_LIB.interview.map((c, i) => ({ ...c, _idx: i }));
  renderCardList(el, pool, 'interview', favSet(), dailySeed(formatDate(new Date())), search);
}
let newsCache = null; // { date, sections:[{name, icon, items:[{title,link,hot}]}] }

function renderNews(el, search) {
  el.innerHTML = `
    <div class="card" style="padding:12px">
      <div class="flex-between" style="margin-bottom:6px">
        <div class="card-title" style="margin-bottom:0">📰 当日火热话题</div>
        <button class="btn btn-secondary btn-sm" id="newsRefresh">🔄 刷新</button>
      </div>
      <div id="newsUpdated" style="font-size:11px;color:var(--text-muted);margin-bottom:8px">数据来源：60s 实时热榜（抖音 / 微博 / 今日要闻）</div>
      <input class="form-input" id="growthSearch" placeholder="🔍 搜索话题" value="${escapeHtml(search || '')}">
    </div>
    <div id="newsBody"><div class="empty-state"><div class="empty-state-text">加载中…</div></div></div>
  `;
  const sInput = document.getElementById('growthSearch');
  sInput.addEventListener('input', () => { if (newsCache) renderNewsBody(el, sInput.value); });
  document.getElementById('newsRefresh').addEventListener('click', () => loadNews(el, document.getElementById('growthSearch').value));
  if (newsCache) renderNewsBody(el, search || '');
  else loadNews(el, search || '');
}

function loadNews(el, search) {
  const body = document.getElementById('newsBody');
  if (body) body.innerHTML = '<div class="empty-state"><div class="empty-state-text">加载中…</div></div>';
  const sources = [
    { key: 'douyin', name: '抖音热议', icon: '🔥', url: 'https://60s.viki.moe/v2/douyin' },
    { key: 'weibo', name: '微博热搜', icon: '🔥', url: 'https://60s.viki.moe/v2/weibo' },
    { key: 'news', name: '今日要闻·财经/政务/生活', icon: '📰', url: 'https://60s.viki.moe/v2/60s' }
  ];
  Promise.all(sources.map(s => fetch(s.url).then(r => r.ok ? r.json() : Promise.reject(new Error(s.name))).then(d => ({ s, d })).catch(e => ({ s, err: e }))))
    .then(results => {
      const sections = []; let date = '';
      results.forEach(({ s, d, err }) => {
        if (err || !d) return;
        if (s.key === 'news') {
          const arr = (d.data && d.data.news) || [];
          if (d.data && d.data.date) date = d.data.date;
          sections.push({ name: s.name, icon: s.icon, items: arr.map(t => ({ title: (typeof t === 'string' ? t : t.title) || '', link: '', hot: 0 })).filter(it => it.title) });
        } else {
          const arr = (d.data) || [];
          sections.push({ name: s.name, icon: s.icon, items: arr.slice(0, 15).map(t => ({ title: t.title || '', link: t.link || '', hot: t.hot_value || 0 })).filter(it => it.title) });
        }
      });
      if (!sections.length) throw new Error('empty');
      newsCache = { date, sections };
      renderNewsBody(el, search || '');
    })
    .catch(() => {
      newsCache = NEWS_FALLBACK;
      renderNewsBody(el, search || '');
      const upd = document.getElementById('newsUpdated');
      if (upd) upd.textContent = '实时接口暂不可用，已显示最近缓存（' + (NEWS_FALLBACK.date || '') + '）';
    });
}

function renderNewsBody(el, search) {
  const cache = newsCache; if (!cache) return;
  const q = (search || '').trim();
  let sections = cache.sections;
  if (q) sections = sections.map(s => ({ name: s.name, icon: s.icon, items: s.items.filter(it => it.title.indexOf(q) >= 0) })).filter(s => s.items.length);
  const upd = document.getElementById('newsUpdated');
  if (upd && cache.date) upd.textContent = '更新于 ' + cache.date + ' · 来源：60s 实时热榜';
  const body = document.getElementById('newsBody');
  if (!sections.length) { body.innerHTML = '<div class="empty-state"><div class="empty-state-text">没有匹配的话题</div></div>'; return; }
  body.innerHTML = sections.map(sec => `
    <div class="card" style="padding:14px">
      <div class="card-title" style="margin-bottom:10px">${sec.icon || ''} ${escapeHtml(sec.name)}</div>
      <div class="news-list">${sec.items.map(it => newsItemHtml(it, 'news|' + sec.name + '|' + it.title)).join('')}</div>
    </div>`).join('') + `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px">点「☆」可收藏 · 数据来自公开热榜接口，仅供参考</div>`;
  body.querySelectorAll('.growth-fav').forEach(b => b.addEventListener('click', () => { toggleFav(b.dataset.fav); const f = favSet(); b.classList.toggle('active'); b.textContent = f.has(b.dataset.fav) ? '★' : '☆'; }));
}

function newsItemHtml(it, id) {
  const fav = favSet().has(id);
  const hot = it.hot ? `<span class="news-hot">🔥${formatHot(it.hot)}</span>` : '';
  const link = it.link ? `<a class="news-link" href="${it.link}" target="_blank" rel="noopener">查看 ↗</a>` : '';
  return `<div class="news-item">
    <div class="news-title">${escapeHtml(it.title)}</div>
    <div class="news-meta">${hot}${link}<button class="growth-fav ${fav ? 'active' : ''}" data-fav="${escapeHtml(id)}" title="收藏">${fav ? '★' : '☆'}</button></div>
  </div>`;
}

function formatHot(n) { return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n); }
