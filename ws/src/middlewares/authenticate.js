const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.json");

module.exports = (req, res, next) => {
    
    
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.json({error:true, message:"Sem token"});
    }

    const parts = authHeader.split(" ")

    if(parts.length !=2){
        return res.json({error:true, message:"Invalid"});
    }

    const [ scheme, token] = parts;


    if(scheme.indexOf("Bearer") !== 0){
        return res.json({
            error:true, message:"token malformeted"
        })
    }
    jwt.verify(token, authConfig.secret, (err, decoded) =>{
        if(err){
            return res.json({error:true, message:"Invalid token/expired"});
        }
        req.userLogged = decoded;
        
        return next();
    })
   


}