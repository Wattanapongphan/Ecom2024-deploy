const prisma = require("../config/prisma")
const cloudinary = require('cloudinary').v2;

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


exports.create = async (req, res) => {
    try {
        //code
        const { title, description, price, quantity, categoryId, images } = req.body
        // console.log(title,description,price,quantity,images)
        const product = await prisma.product.create({
            data: {
                title: title,
                description: description,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                categoryId: parseInt(categoryId),
                images: {
                    create: images.map((item) => ({
                        asset_id: item.asset_id,
                        public_id: item.public_id,
                        url: item.url,
                        secure_url: item.secure_url
                    }))
                }

            }
        })

        res.send(product)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.list = async (req, res) => {
    try {
        //code
        const { count } = req.params
        const products = await prisma.product.findMany({
            take: parseInt(count),
            orderBy: { createdAt: "desc" },
            include: {
                category: true,
                images: true
            }
        })
        res.send(products)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.read = async (req, res) => {
    try {
        //code
        const { id } = req.params
        const products = await prisma.product.findFirst({
            where: {
                id: Number(id)
            },
            include: {
                category: true,
                images: true
            }
        })
        res.send(products)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.update = async (req, res) => {
    try {
        //code
        const { title, description, price, quantity, categoryId, images } = req.body
        // console.log(title,description,price,quantity,images)

        //clear images
        await prisma.image.deleteMany({
            where: {
                productId: Number(req.params.id)
            }
        })

        const product = await prisma.product.update({
            where: {
                id: Number(req.params.id)
            },
            data: {
                title: title,
                description: description,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                categoryId: parseInt(categoryId),
                images: {
                    create: images.map((item) => ({
                        asset_id: item.asset_id,
                        public_id: item.public_id,
                        url: item.url,
                        secure_url: item.secure_url
                    }))
                }

            }
        })

        res.send(product)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.remove = async (req, res) => {
    try {
        //code
        const { id } = req.params
        // step 1  ค้นหาสินค้า include images
        const product = await prisma.product.findFirst({
            where:{id:Number(id)},
            include:{images:true}
        })
        if(!product){
            return res.status(404).json({Message:'Product not found'})
        }
        console.log(product)
        // step 2 Promise ลบณุปภาพใน cloud ลบแบบ รอฉันด้วย 
        const deleteImage = product.images.map((image)=> new Promise((resolve,reject)=>{
            //ลบจาก cloud
            cloudinary.uploader.destroy(image.public_id,(error,result)=>{
                if(error) reject(error) 
                    else resolve(result)
            })
        }))
        await Promise.all(deleteImage)
        // // step 3 ลบสินค้า
        await prisma.product.delete({
            where: {
                id: Number(id)
            }
        })
        
        res.send("Delete Success")
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.listby = async (req, res) => {
    try {
        //code
        const { sort, order, limit } = req.body
        const products = await prisma.product.findMany({
            take: limit,
            orderBy: { [sort]: order },
            include: { 
                category: true,
                images: true
             }
        })

        res.send(products)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}

const handleQuery = async (req, res, query) => {
    try {
        //code
        const products = await prisma.product.findMany({
            where: {
                title: {
                    contains: query,
                }
            },
            include: {
                category: true,
                images: true
            }
        })
        res.send(products)
    } catch (err) {
        //err
        console.log(err)
        res.status(500).json({ Message: "Search error" });
    }
}

const handlePrice = async (req, res, priceRange) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                price: {
                    gte: priceRange[0],
                    lte: priceRange[1]
                }
            },
            include: {
                category: true,
                images: true
            }
        })
        res.send(products)

    } catch (err) {
        console.log(err)
        res.status(500).json({ Message: "Search error" });
    }
}
const handleCategory = async (req, res, categoryId) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                categoryId: {
                    in: categoryId.map((id) => Number(id))
                }
            },
            include: {
                category: true,
                images: true
            }
        })
        res.send(products)

    } catch (err) {
        console.log(err)
        res.status(500).json({ Message: "Search error" });
    }
}

exports.searchFilters = async (req, res) => {
    try {
        //code
        const { query, category, price } = req.body

        if (query) {
            console.log('query-->', query)
            await handleQuery(req, res, query)
        }

        if (category) {
            console.log('category-->', category)
            await handleCategory(req, res, category)
        }

        if (price) {
            console.log('price-->', price)
            await handlePrice(req, res, price)
        }

        // res.send("Hello searchFilters product")
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}


exports.createImages = async (req, res) => {
    try {
        //code
        // console.log(req.body)
        const result = await cloudinary.uploader.upload(req.body.image, {
            public_id: `Wattanapongphan-${Date.now()}`,
            resource_type: 'auto',
            folder: 'Ecom2024'
        })
        res.send(result)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}
exports.removeimage = async (req, res) => {
    try {
        //code
        const { public_id } = req.body
        // console.log(public_id)
        cloudinary.uploader.destroy(public_id, (result) => {
            res.send('Remove Image Successful!!')
        })


    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "server error" });
    }
}