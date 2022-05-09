// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
    let { invitationCode, state, sort, limit, skip, timeArr = [] } = event;
    return await db
        .collection("users")
        .where({
            invitationCode,
            identity: "user",
            state: state == "all" ? _.neq("all") : state,
            applyDate: timeArr[0]
                ? _.and(_.gt(timeArr[0]), _.lt(timeArr[1]))
                : _.gt(0),
        })
        .orderBy("applyDate", sort == "select" ? "asc" : sort)
        .skip(skip)
        .limit(limit)
        .get();
};
