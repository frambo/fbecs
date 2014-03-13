var ids = {
facebook: {
 clientID: '215919575167877',
 clientSecret: '52a4bd5ac85cf01716d77f7ed2efd7a6',
 callbackURL: 'http://localhost:3000/auth/facebook/callback'
},
twitter: {
 consumerKey: 'get_your_own',
 consumerSecret: 'get_your_own',
 callbackURL: "http://localhost:3000/auth/twitter/callback"
},
github: {
 clientID: 'get_your_own',
 clientSecret: 'get_your_own',
 callbackURL: "http://localhost:3000/auth/github/callback"
},
google: {
 returnURL: 'http://localhost:3000/auth/google/callback',
 realm: 'http://localhost:3000'
}
}

module.exports = ids
