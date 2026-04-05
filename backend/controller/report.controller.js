const { StoreSupply } = require("../model/storeSupplySchema")

const getDailyReport = async (req, res) => {
    try {
        let { date } = req.query;

        if (!date) {
            const today = new Date();
            date = today.toISOString().slice(0, 10);
        }

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const data = await StoreSupply.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: "$quantity" },
                    totalSales: { $sum: "$totalAmount" },
                    totalPaid: { $sum: "$paidAmount" },
                    totalDebt: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } }
                }
            },
            { $project: { _id: 0 } }
        ]);


        res.json({
            success: true,
            data: data[0] || { totalQuantity: 0, totalSales: 0, totalPaid: 0, totalDebt: 0 }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "xato", error: e.message });
    }
};

// Monthly Report
const getMonthlyReport = async (req, res) => {
    try {
        const { month } = req.query // YYYY-MM

        // Sana tekshiruvi
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                success: false,
                message: "Invalid month format. Use YYYY-MM"
            })
        }

        const [year, m] = month.split("-").map(Number)
        const start = new Date(year, m - 1, 1)
        start.setHours(0, 0, 0, 0)

        const end = new Date(year, m, 0)
        end.setHours(23, 59, 59, 999)

        const data = await StoreSupply.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    storeId: 1,
                    productName: "$product.name",
                    quantity: 1,
                    totalAmount: 1,
                    paidAmount: 1,
                    debt: { $subtract: ["$totalAmount", "$paidAmount"] }
                }
            }
        ])

        res.json({ success: true, data })
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
}

module.exports = { getDailyReport, getMonthlyReport }
