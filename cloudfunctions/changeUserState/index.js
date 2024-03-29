// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();
const _ = db.command;
const users = db.collection("users");

// 云函数入口函数
exports.main = async (event, context) => {
    let { phone, newState } = event;
    return await users
        .where({ phone })
        /* 更新 user 的 state 字段、新增 reimbursement 字段（订单金额） */
        .update({ data: { state: newState } });
};
