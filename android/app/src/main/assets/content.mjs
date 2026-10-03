export const EXTRA_HEROES={
 warden:{name:'曜石',title:'曙光守卫',role:'坦克 / 控制',color:0xffd08a,health:1180,mana:310,attack:49,power:0,armor:42,speed:7.2,range:3.7,rate:.95,skills:['裂地锤','不屈壁垒','盾锋冲阵','曙光震荡']},
 shade:{name:'夜刃',title:'暗影行者',role:'刺客 / 爆发',color:0xf498aa,health:730,mana:300,attack:63,power:0,armor:18,speed:9,range:3.4,rate:.6,skills:['影袭','飞刃','潜影','终幕处决']},
 tide:{name:'澜歌',title:'潮汐祭司',role:'辅助 / 治疗',color:0x87efd9,health:790,mana:460,attack:36,power:38,armor:18,speed:7.7,range:8.4,rate:.92,skills:['涌潮','治愈之雨','潮汐护佑','海之祈愿']}
};
export const EXTRA_ITEMS=[
 {id:'vampire',name:'饮血之锋',price:900,icon:'blade',category:'attack',desc:'攻击 +38 · 普攻吸血 15%',attack:38,lifesteal:.15},
 {id:'storm',name:'风暴之弓',price:1050,from:'bow',icon:'bow',category:'attack',desc:'攻击 +32 · 攻速 +50% · 暴击 15%',attack:32,haste:.5,crit:.15},
 {id:'infinity',name:'终焉之刃',price:1200,from:'blade',icon:'blade',category:'attack',desc:'攻击 +68 · 暴击 25%',attack:68,crit:.25},
 {id:'void',name:'虚空法杖',price:1150,from:'orb',icon:'orb',category:'magic',desc:'法强 +130 · 法术穿透 35%',power:130,penetration:.35},
 {id:'frost',name:'霜月权杖',price:850,icon:'star',category:'magic',desc:'法强 +55 · 技能减速 1 秒',power:55,frost:1},
 {id:'hourglass',name:'星砂沙漏',price:1000,from:'crown',icon:'crown',category:'magic',desc:'法强 +70 · 护甲 +25 · 冷却 -15%',power:70,armor:25,cdr:.15},
 {id:'heart',name:'巨人之心',price:1100,from:'armor',icon:'shield',category:'defense',desc:'生命 +650 · 护甲 +40 · 每秒回血 +6',health:650,armor:40,regen:6},
 {id:'thorns',name:'荆棘战甲',price:800,icon:'shield',category:'defense',desc:'生命 +250 · 护甲 +55 · 反伤 12%',health:250,armor:55,thorns:.12},
 {id:'spirit',name:'灵息披风',price:750,icon:'shield',category:'defense',desc:'生命 +350 · 法术减伤 25%',health:350,magicResist:.25},
 {id:'swift',name:'疾风战靴',price:650,from:'boots',icon:'boot',category:'move',desc:'移速 +2.2 · 攻速 +20%',speed:2.2,haste:.2},
 {id:'mercy',name:'圣泉之冠',price:900,icon:'crown',category:'magic',desc:'法强 +45 · 回蓝 +8 · 冷却 -10%',power:45,manaRegen:8,cdr:.1},
 {id:'banner',name:'先锋战旗',price:900,icon:'star',category:'defense',desc:'生命 +300 · 攻击 +25 · 攻速 +15%',health:300,attack:25,haste:.15}
];
export const HERO_DETAILS={
 blade:{passive:'乘风：每次施法后，下一次普攻伤害提高 35%。',skills:['向前突进并斩击周围敌人。','回旋斩击附近敌人，恢复生命。','获得持续 4 秒的护盾。','跃向目标方向，重击并减速周围敌人。']},
 mage:{passive:'星辉：法术命中时额外造成 8% 法强伤害。',skills:['发射可穿透两个目标的星辉弹。','在前方降下霜阵，造成伤害并减速。','向指定方向闪现。','短暂预警后，陨星砸向前方区域。']},
 ranger:{passive:'鹰眼：每第三次普攻伤害提高 50%。',skills:['向前发射三支穿云箭。','扇形散射，对前方敌人造成伤害。','朝指定方向翻滚。','发射七支穿透箭矢，覆盖大范围。']},
 warden:{passive:'坚守：生命低于 35% 时，受到伤害降低 15%。',skills:['重锤前方，减速并短暂眩晕。','获得护盾，4 秒内减伤 35%。','持盾冲锋，击晕落点附近敌人。','震击大地，伤害与自身最大生命相关，并眩晕敌人。']},
 shade:{passive:'背水：攻击生命低于 35% 的敌人时，伤害提高 25%。',skills:['冲向指定方向，斩击周围敌人。','投掷三把穿透飞刃。','潜行 3 秒并提高移速；攻击或施法会显形。','闪袭前方敌人，低血量目标承受额外伤害。']},
 tide:{passive:'余波：施法时恢复自身少量生命。',skills:['潮水拍向前方，造成伤害与减速。','治疗自身和附近友方英雄。','为附近友方英雄添加护盾。','潮汐大范围治疗友军，同时伤害并控制敌人。']}
};
export const RUNES={balanced:{name:'均衡',desc:'生命 +80 · 攻击 +5',health:80,attack:5},fury:{name:'强攻',desc:'攻击 +10 · 攻速 +10%',attack:10,haste:.1},arcane:{name:'秘法',desc:'法强 +20 · 回蓝 +2',power:20,manaRegen:2},guardian:{name:'守护',desc:'生命 +180 · 护甲 +8',health:180,armor:8}};
export const DIFFICULTIES={easy:{name:'休闲',desc:'敌方属性较低，适合熟悉英雄',enemy:.78,reward:60},normal:{name:'标准',desc:'完整三路对局与野区争夺',enemy:1,reward:100},hard:{name:'挑战',desc:'敌方属性提高，技能更积极',enemy:1.2,reward:150},training:{name:'练习',desc:'初始满级与金币，练习技能和装备',enemy:.85,reward:0}};
export const CHALLENGES=[{id:'first',name:'初次凯旋',desc:'累计赢得 1 场标准或挑战对局',goal:1,stat:'wins',reward:100},{id:'hunter',name:'峡谷猎手',desc:'累计击败 20 名敌方英雄',goal:20,stat:'kills',reward:150},{id:'veteran',name:'久经沙场',desc:'累计完成 5 场对局',goal:5,stat:'matches',reward:200}];
