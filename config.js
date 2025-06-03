// Updated config.js - Configuration settings for the application
const config = {
    MONGODB_URL: 'mongodb+srv://KingAudu:Abdulrasaq24@cluster0.pkhzj2l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    JWT_SECRET: 'KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
    JWT_TOKEN: "72aebad1b92856081fc75f3c95216ba2",
    JWT_EXPIRY: '24h',
    PORT: process.env.PORT || 3000,
    
    // Email configuration
    EMAIL_USER: process.env.EMAIL_USER || 'auduabdulrak@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS || 'vhvo yjpl vknu phez', 
    
    // Frontend URL (for email links)
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

module.exports = config;