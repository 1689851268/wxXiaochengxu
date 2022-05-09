Page({
    data: {
        /* 用户填入的数据 */
        phone: "", // 电话号码
        sms: "", // 验证码
        /* 验证码 */
        realSms: "", // 真的验证码
        smsTime: "", // 验证码节流时间
        smsTimer: "", // 计时器
        /* 辅助数据 */
        phoneOk: "", // 检查手机号码
        smsOk: "", // 检查验证码
        identity: "", // 该账号的身份
        showOption: false, // 超级管理员的功能
    },

    // 检查用户输入的手机号码
    checkPhone(e) {
        if (/^1[3|4|5|7|8][0-9]\d{8}$/.test(e.detail))
            this.setData({ phoneOk: true });
        else this.setData({ phoneOk: false });
    },

    // 验证用户输入的短信验证码
    checkSms(e) {
        if (e.detail.length == 6) this.setData({ smsOk: true });
        else this.setData({ smsOk: false });
    },

    // 获取验证码
    getSms() {
        wx.showLoading();
        /* 调用云函数、遍历数据库 */
        wx.cloud
            .callFunction({
                name: "checkRoot",
                data: { phone: this.data.phone },
            })
            /* 检查是否为管理员 */
            .then(res => {
                let data = res.result.data;
                if (data.length) {
                    this.setData({ identity: data[0].identity });
                    return "ok";
                }
                return Promise.reject("no Permission");
            })
            /* 获取验证码并保存起来 */
            .then(_ => {
                wx.request({
                    url: "https://www.onlyid.net/api/open/send-otp",
                    method: "POST",
                    header: { "content-type": "application/json" },
                    data: {
                        recipient: this.data.phone,
                        clientId: "55a858cc9db2491ead2a3f23e7cb0681",
                        clientSecret: "458645a3b4c243248572cd658be97b18",
                    },
                    success: res => {
                        if (res.statusCode == 200) {
                            this.setData({ realSms: res.data.code });
                            /* 验证码 5 分钟后失效 */
                            setTimeout(() => {
                                this.setData({ realSms: "" });
                            }, 5 * 60 * 1000);
                            wx.hideLoading();
                        } else {
                            wx.showToast({
                                title: "验证码获取失败",
                                icon: "error",
                            });
                            console.log("验证码获取失败 - ", res);
                        }
                    },
                    fail: err => {
                        wx.showToast({
                            title: "验证码获取失败",
                            icon: "error",
                        });
                        console.log("验证码获取失败 - ", err);
                    },
                    /* 读秒，指定时间内只能获取一次验证码 */
                    complete: _ => {
                        this.setSmsCd();
                    },
                });
            })
            /* 处理错误 */
            .catch(err => {
                if (err == "no Permission")
                    wx.showToast({ title: "您不是管理员", icon: "error" });
                else {
                    wx.showToast({ title: "数据获取失败", icon: "error" });
                    console.log("数据获取失败 - ", err);
                }
                this.setSmsCd();
            });
    },

    setSmsCd() {
        this.setData({ smsTime: 60 });
        this.data.smsTimer = setInterval(() => {
            this.setData({ smsTime: --this.data.smsTime });
            if (this.data.smsTime <= 0) {
                clearInterval(this.data.smsTimer);
                this.setData({ smsTime: 0 });
            }
        }, 1000);
    },

    // 重置数据
    clearData() {
        this.setData({
            /* 用户填入的数据 */
            phone: "", // 电话号码
            sms: "", // 验证码
            /* 辅助数据 */
            phoneOk: "", // 检查手机号码
            smsOk: "", // 检查验证码
            // smsTimer: "", // 验证码节流时间
            // realSms: "", // 真的验证码
        });
    },

    // 验证身份
    authentication() {
        /* 1. 校验短信验证码 */
        if (this.data.realSms == this.data.sms) {
            if (this.data.identity == "root") {
                // 跳转到管理员页面
                wx.navigateTo({
                    url: `../rootManage/rootManage?phone=${this.data.phone}`,
                });
            } else if (this.data.identity == "superRoot") {
                this.setData({ showOption: true });
            }
        } else {
            wx.showToast({ title: "验证码错误", icon: "error" });
        }
    },

    // 超级管理员跳转
    jump(e) {
        let option = e.currentTarget.dataset.option;
        if (option == "set") {
            wx.navigateTo({
                url: `../setPermission/setPermission`,
            });
        } else if (option == "examine") {
            wx.navigateTo({
                url: `../superRootManage/superRootManage?phone=${this.data.phone}`,
            });
        } else {
            wx.navigateTo({
                url: `../addRoot/addRoot`,
            });
        }
    },

    // 页面隐藏 / 切入后台时触发
    onHide() {
        setTimeout(() => {
            this.clearData();
        }, 1000);
    },
});
