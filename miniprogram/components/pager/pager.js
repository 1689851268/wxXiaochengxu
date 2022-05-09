// components/pager.js
Component({
    properties: {
        total: Number,
        showNumInOnePage: Number,
        curPage: Number,
        pageNum: Number,
    },

    methods: {
        changePage(e) {
            this.triggerEvent("change", { cur: e.currentTarget.dataset.cur });
        },
    },
});
