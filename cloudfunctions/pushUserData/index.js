// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

// 获取数据库索引
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { name, phone, invitationCode, screenshotID } = event;
    return await db.collection("users").add({
        data: {
            name,
            phone,
            invitationCode,
            screenshotID,
            identity: "user",
            applyDate: Date.now(),
            state: "waiting",
        },
    });
};
