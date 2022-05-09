Page({
    data: {
        /* 用户的信息 */
        openid: "", // openid
        userInfo: {}, // 头像、昵称
        /* 存储到数据库的数据 */
        name: "", // 姓名
        phone: "", // 手机号码
        invitationCode: "", // 邀请码
        /* 验证码 */
        sms: "", // 验证码
        realSms: "", // 从后台获取的真实验证码
        smsTime: 0, // 获取验证码的 cd
        smsTimer: 0, // 控制 cd 的定时器
        /* 辅助数据 */
        screenshot: [], // 截图数组
        phoneOk: false, // 手机初筛情况
        smsOk: false, // 验证码初筛情况
    },

    // 获取用户信息：头像、昵称
    getUserInfo() {
        wx.getUserProfile({
            desc: "用于完善用户信息",
            success: res => {
                let { avatarUrl, nickName } = res.userInfo;
                this.setData({ userInfo: { avatarUrl, nickName } });
                this.getOpenid(); // 获取 openid
            },
            fail: err => {
                wx.showToast({ title: "用户信息获取失败", icon: "error" });
                console.log("用户信息获取失败 - ", err);
            },
        });
    },

    // 获取用户的 openid
    getOpenid() {
        wx.showLoading({ title: "加载中...", mask: true });
        wx.cloud
            .callFunction({ name: "getOpenid" })
            .then(res => {
                this.setData({ openid: res.result });
                wx.hideLoading();
            })
            .catch(err => {
                wx.showToast({ title: "用户 id 获取失败", icon: "error" });
                console.log("openid 获取失败 - ", err);
            });
    },

    // 检查用户输入的姓名
    checkName(e) {
        let name = e.detail.trim();
        if (name) this.setData({ name });
        else this.setData({ name: "" });
    },

    // 检查用户输入的手机号码
    checkPhone(e) {
        if (/^1[3|4|5|7|8]\d{9}$/.test(e.detail))
            this.setData({ phoneOk: true });
        else this.setData({ phoneOk: false });
    },

    // 检查用户输入的短信验证码
    checkSms(e) {
        if (e.detail.length == 6) this.setData({ smsOk: true });
        else this.setData({ smsOk: false });
    },

    // 获取验证码
    getSms(e) {
        wx.showLoading();
        /* 调用云函数、过筛一下数据库 */
        wx.cloud
            .callFunction({
                name: "checkUser",
                data: { phone: this.data.phone },
            })
            /* 检查用户是否已申请 */
            .then(res => {
                // 如果数据库中不存在该用户，则允许进入小程序、获取验证码
                if (res.result.data.length == 0) return "ok";
                // 如果数据库中已存在该用户，则不允许进入小程序、将其拦截在外
                else return Promise.reject("no Permission");
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
                        clientSecret: "bc4c687efeb24adf97731902b44c9f5b",
                    },
                    success: res => {
                        // 验证码获取成功 / 失败
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
                            console.log("验证码获取失败 - ", err);
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
            /* 错误处理 */
            .catch(err => {
                if (err == "no Permission")
                    wx.showToast({ title: "该账号已申请", icon: "error" });
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

    // 展示上传的截图
    afterRead(e) {
        const url = e.detail.file.url;
        const { screenshot = [] } = this.data;
        screenshot.push({ url });
        this.setData({ screenshot });
    },

    // 删除选中的图片
    deleteImg() {
        this.setData({ screenshot: [] });
    },

    // 验证身份
    authentication() {
        /* 1. 校验短信验证码 */
        let { realSms, sms } = this.data;
        if (realSms == sms) {
            wx.showLoading({ title: "数据上传中...", mask: true });
            let { name, phone, invitationCode, screenshot } = this.data;
            invitationCode = invitationCode ? invitationCode : "default";
            /* 2. 上传截图、获取截图 ID */
            wx.cloud
                .uploadFile({
                    cloudPath: `${invitationCode}/${phone}.png`,
                    filePath: screenshot[0].url,
                })
                /* 3. 存储新用户 */
                .then(res => {
                    return wx.cloud.callFunction({
                        name: "pushUserData",
                        data: {
                            name,
                            phone,
                            invitationCode,
                            screenshotID: res.fileID,
                        },
                    });
                })
                /* 4. 更新商家的客户数量 */
                .then(_ => {
                    if (invitationCode) {
                        return wx.cloud.callFunction({
                            name: "updateRootsOrderInfo",
                            data: {
                                invitationCode,
                                oldState: "all",
                                newState: "waiting",
                            },
                        });
                    }
                })
                /* 5.1 提示上传成功 */
                .then(_ => {
                    wx.showToast({ title: "数据上传成功" });
                    /* 清空数据 */
                    wx.removeStorageSync("userData");
                    this.setData({
                        /* 用户的信息 */
                        openid: "", // openid
                        userInfo: {}, // 用户信息（头像、昵称）
                        /* 存储到数据库的数据 */
                        name: "", // 姓名
                        phone: "", // 手机号码
                        invitationCode: "", // 邀请码
                        screenshot: [], // 截图数组
                        /* 辅助数据 */
                        sms: "", // 验证码
                        phoneOk: false, // 手机初筛情况
                        smsOk: false, // 验证码初筛情况
                        realSms: "", // 从后台获取的真实验证码
                    });
                })
                /* 5.2 提示上传失败 */
                .catch(err => {
                    wx.showToast({
                        title: "数据上传失败",
                        icon: "error",
                    });
                    console.log("数据上传失败 - ", err);
                });
        } else {
            wx.showToast({ title: "验证码错误", icon: "error" });
        }
    },
});
