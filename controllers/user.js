const prisma = require("../config/prisma")

exports.listUsers = async(req,res)=>{
    try{
        //code
        const users = await prisma.user.findMany({
            select:{
                id:true,
                email:true,
                role:true,
                enabled:true,
                address:true
            }
        })
        res.json(users)
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.changeStatus = async(req,res)=>{
    try{
        //code
        const{id,enabled} = req.body
        console.log(id,enabled)
        const user = await prisma.user.update({
            where:{id:Number(id)},
            data:{enabled:enabled}
        })
        res.send('Update status Success')
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.changeRole = async(req,res)=>{
    try{
        //code
        const{id,role} = req.body
        const user = await prisma.user.update({
            where:{id:Number(id)},
            data:{role:role}
        })
        res.send('Update Role Success')
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.userCart = async(req,res)=>{
    try{
        //code
        const{cart} = req.body
        console.log(cart)
        console.log(req.user.id)

        const user = await prisma.user.findFirst({
            where:{id:Number(req.user.id)}
        })
        // console.log(user)
        // Check quantity
        for(const item of cart){
            // console.log(item)
            const product = await prisma.product.findUnique({
                where:{id:item.id},
                select:{quantity:true,title:true}
            })
            console.log(item)
            console.log(product)
            if(!product || item.count > product.quantity){
                return res.status(400).json({ok:false,message:`ขออภัย. สินค้า ${product?.title || 'product' } หมดแล้ว`})
            }
        }

        //Deleted old cart item
        await prisma.productOnCart.deleteMany({
            where:{
                cart:{
                    orderedById:user.id
                }
            }
        })
        // Delete old cart
        await prisma.cart.deleteMany({
            where:{ orderedById:user.id}
        })

        //เตรียมสินค้า
        let products = cart.map((item)=>({
            productId:item.id,
            count:item.count,
            price:item.price
        }))

        //หาผลรวม
        let cartTotal = products.reduce((sum,item)=> 
            sum+item.price * item.count,0)

        // New cart
        const newcart = await prisma.cart.create({
            data:{
                products:{
                    create:products
                },
                cartTotal:cartTotal,
                orderedById:user.id
            }
        })

        console.log(cartTotal)

        res.send('Add Cart Success')
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.getUserCart = async(req,res)=>{
    try{
        //code
        const cart = await prisma.cart.findFirst({
            where:{
                orderedById:Number(req.user.id)
            },
            include:{
                products:{
                    include:{
                        product:true
                    }
                }
            }
        })
        // console.log(cart)
        res.json({
            products:cart.products,
            cartTotal:cart.cartTotal
        })
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.emptyCart = async(req,res)=>{
    try{
        //code
        const cart = await prisma.cart.findFirst({
            where:{orderedById:Number(req.user.id)}
        })
        if(!cart){
            return res.status(400).json({message:'No cart'})
        }
        await prisma.productOnCart.deleteMany({
            where:{cartId:cart.id}
        })
        const result = await prisma.cart.deleteMany({
            where:{orderedById:Number(req.user.id)}
        })

        console.log(result)
        res.json({message: 'cart Empty Success',
            deleteCount: result.count
        })
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.saveAddress = async(req,res)=>{
    try{
        //code
        const {address} = req.body
        console.log(address)
        const addressUser = await prisma.user.update({
            where:{
                id:Number(req.user.id)
            },
            data:{
                address:address
            }
        })


        res.json({OK: true,message:'Address update Success'})
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.saveOrder = async(req,res)=>{
    try{
        //code
        // Step 0 Check Stripe
        // console.log(req.body)
        // return res.send('Hello jukkru!!!!')
        // stripePaymentId String
        // amount Int
        // status String
        // currentcy String

        const {id,amount,status,currency} = req.body.paymentIntent

        //step 1 get user cart
        const userCart = await prisma.cart.findFirst({
            where:{
                orderedById:Number(req.user.id)
            },
            include:{products:true}
        })

        //Check Cart Empty
        if(!userCart || userCart.products.length === 0){
            return res.status(400).json({ok:false,message:'Cart is Empty'})
        }

        const amountTHB = Number(amount) / 100
        //create a new order
        const order = await prisma.order.create({
            data:{
                products:{
                    create: userCart.products.map((item)=>({
                        productId:item.productId,
                        count:item.count,
                        price:item.price
                    }))
                },
                orderedBy:{
                    connect:{id:req.user.id}
                },
                cartTotal:userCart.cartTotal,
                stripePaymentId:id,
                amount:amountTHB,
                status:status,
                currency:currency
                
            }
        })

        // stripePaymentId String
        // amount Int
        // status String
        // currentcy String

        //update Product
        const update = userCart.products.map((item)=>({
            where:{ id:item.productId},
            data:{
                quantity:{decrement:item.count},
                sold:{increment:item.count}
            }
        }))
        console.log(update)

        await Promise.all(
            update.map((updated)=> prisma.product.update(updated))
        )

        await prisma.cart.deleteMany({
            where:{orderedById:Number(req.user.id)}
        })

        res.json({ok:true,order})
    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}
exports.getOrder = async(req,res)=>{
    try{
        //code
        const orders = await prisma.order.findMany({
            where:{orderedById:Number(req.user.id)},
            include:{
                products:{
                    include:{
                        product:true
                    }
                }
            }
        })
        if(!orders.length === 0){
            return res.status(400).json({of:false,message:'No orders'})
        }
        res.json({ok:true,orders})

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Server error'})
    }
}