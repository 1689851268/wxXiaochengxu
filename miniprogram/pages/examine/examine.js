// pages/examine/examine.js
Page({
    data: {
        name: "", // 用户姓名
        phone: "", // 电话号码
        screenshotID: "", // 截图 ID
        invitationCode: "", // 邀请码
        state: "", // 用户的状态
        /* 控制遮罩层 */
        show: false,
        info: "", // 审批不通过的原因
        placeholder: "123123123",
    },

    // 预览图片
    preview(e) {
        wx.previewMedia({
            sources: [{ url: this.data.screenshotID }],
        });
    },

    // 同步输入框的内容（ 驳回理由 / 订单金额 ）
    updateInfo(e) {
        this.setData({ info: e.detail.value });
    },

    // 关闭遮罩层、清空输入框
    onClose() {
        this.setData({ show: false });
        setTimeout(() => {
            this.setData({ info: "" });
        }, 500);
    },

    // 打开弹窗
    operation(e) {
        let op = e.currentTarget.dataset.op; // 通过 / 驳回
        let { phone, invitationCode, state } = this.data;
        if (op == "passIt" && state == "waiting") {
            wx.showLoading({ title: "更新中...", mask: true });
            /* 修改 user 的 state */
            wx.cloud
                .callFunction({
                    name: "changeUserState",
                    data: { phone, newState: "pass" },
                })
                /* 更新 root 的 orderInfo */
                .then(_ => {
                    return wx.cloud.callFunction({
                        name: "updateRootsOrderInfo",
                        data: {
                            invitationCode,
                            oldState: state,
                            newState: "pass",
                        },
                    });
                })
                .then(_ => {
                    wx.navigateBack(); // 退回上一层
                    wx.hideLoading();
                })
                .catch(err => {
                    wx.showToast({ title: "更新失败" });
                    console.log("更新失败 - ", err);
                });
        } else if (op == "denyIt") {
            this.setData({ show: true, placeholder: "请填写驳回理由" });
        } else {
            this.setData({ show: true, placeholder: "请填写金额" });
        }
    },

    // 提交填写的信息
    submitInfo() {
        wx.showLoading({ title: "提交中...", mask: true });
        let { phone, info, invitationCode, state, placeholder } = this.data;
        /* repay → repay_success */
        if (placeholder == "请填写金额") {
            let newState = "repay_success";
            /* 添加新字段 reimbursement （订单金额）、更新 user 的 state 字段 */
            wx.cloud
                .callFunction({
                    name: "setReason",
                    data: {
                        phone,
                        info,
                        newField: "reimbursement",
                        newState,
                    },
                })
                /* 更新 root 的 orderInfo 字段 */
                .then(_ => {
                    return wx.cloud.callFunction({
                        name: "updateRootsOrderInfo",
                        data: {
                            invitationCode,
                            oldState: state,
                            newState,
                        },
                    });
                })
                .then(_ => {
                    this.onClose(); // 关闭遮罩层
                    wx.navigateBack(); // 退回上一层
                    wx.hideLoading();
                })
                .catch(err => {
                    wx.showToast({ title: "更新失败", icon: "error" });
                    console.log("更新失败 - ", err);
                });
        } /* repay → repay_fail */ else if (placeholder == "请填写驳回理由") {
            let newState = state == "waiting" ? "flunk" : "repay_fail",
                newField = state == "waiting" ? "flunkReason" : "failReason";
            /* 给该 user 添加 info 字段、更新用户的 state 字段 */
            wx.cloud
                .callFunction({
                    name: "setReason",
                    data: { phone, info, newField, newState },
                })
                /* 更新 root 的 orderInfo 字段 */
                .then(_ => {
                    return wx.cloud.callFunction({
                        name: "updateRootsOrderInfo",
                        data: { invitationCode, oldState: state, newState },
                    });
                })
                .then(_ => {
                    this.onClose(); // 关闭遮罩层
                    wx.navigateBack(); // 退回上一层
                    wx.hideLoading();
                })
                .catch(err => {
                    wx.showToast({ title: "更新失败", icon: "error" });
                    console.log("更新失败 - ", err);
                });
        }
    },

    //  监听页面加载
    onLoad(options) {
        // 初始化数据
        let { name, phone, screenshotID, invitationCode, state } = options;
        this.setData({ name, phone, screenshotID, invitationCode, state });
    },
});
/*
1. waiting：查看用户截图、信息
	1.1 通过：修改 user 的 state、更新 root 的 orderInfo
			 返回上一页

	1.2 驳回：打开遮罩层、填写驳回原因
		1.2.1 确定：新增 flunkReason 字段、更新 user 的 state、更新 root 的 orderInfo
		     关闭遮罩层、返回上一页
		1.2.2 取消：清空输入框、关闭遮罩层


2. repay：查看商家的截图
	2.1 通过：打开遮罩层、填写订单金额
		2.1.1 确定：新增 reimbursement 字段、更新 user 的 state、更新 root 的 orderInfo
			 关闭遮罩层、返回上一页
		2.1.2 取消：清空输入框、关闭遮罩层

	2.2 驳回：打开遮罩层、填写驳回原因
		2.2.1 确定：新增 failReason 字段、更新 user 的 state、更新 root 的 orderInfo
			 关闭遮罩层、返回上一页
		2.2.2 取消：清空输入框、关闭遮罩层
*/
