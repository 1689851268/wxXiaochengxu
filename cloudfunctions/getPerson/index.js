// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { phone } = event;
    return await db
        .collection("users")
        .where({ phone })
        .field({ identity: 1, invitationCode: 1, invitedYard: 1 })
        .get();
};
