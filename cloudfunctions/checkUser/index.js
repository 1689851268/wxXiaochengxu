/*
	查看数据库 users 中是否存在该用户，包括 user、root、superRoot
*/

// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

// 获取数据库索引
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { phone } = event;
    return await db.collection("users").where({ phone }).get();
};
