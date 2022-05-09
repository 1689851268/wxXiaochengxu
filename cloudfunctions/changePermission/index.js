// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { identity, phone, invitationCode, invitedYard } = event;

    // 创建邀请码
    function createInvitationCode() {
        let bool = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM";
        let res = [];
        while (res.length !== 6) {
            let index = Math.floor(Math.random() * bool.length);
            res[res.length] = bool[index];
        }
        return res.join("");
    }

    /* user → root */
    if (identity == "root") {
        return await db
            .collection("users")
            .where({ phone })
            .update({
                data: {
                    identity,
                    invitedYard: invitationCode,
                    invitationCode: createInvitationCode(),
                    orderInfo: {
                        all: 0,
                        waiting: 0,
                        flunk: 0,
                        pass: 0,
                        repay: 0,
                        repay_fail: 0,
                        repay_success: 0,
                    },
                },
            });
    } /* root → user */ else {
        return await db
            .collection("users")
            .where({ phone })
            .update({
                data: {
                    identity,
                    invitationCode: invitedYard || "default",
                },
            });
    }
};

/*
root → user
1. 修改 identity 为 "user"
2. 将 incitedYard 赋值给 invitationCode（如果有的话）
*/

/*
user → root
1. 修改 identity 为 "root"
2. 存储 invitationCode 为 invitedYard
3. 创建自己的 invitationCode
4. 初始化 orderInfo { all:0, waiting:0, flunk:0, pass:0, repay:0, repay_fail:0, repay_success:0 }
*/
