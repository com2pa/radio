const refresRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../model/user');
const { userExtractor } = require('../middleware/auth');

refresRouter.get('/',userExtractor,async(req,res)=>{
    return res.status(200).json({
        id: req.user.id,
        name: req.user.name,
        role:req.user.role
    })
});

module.exports = refresRouter;