// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { phone, info, newField, newState } = event;
    return await db
        .collection("users")
        .where({ phone })
        .update({ data: { [newField]: info, state: newState } });
};
