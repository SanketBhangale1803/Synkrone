const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/users');
const { v4: uuidv4 } = require('uuid');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.avatar = profile.photos[0]?.value;
        await user.save();
        return done(null, user);
      }
      
      // For new Google users, create a temporary user object for role selection
      const tempGoogleUser = {
        isNewGoogleUser: true,
        googleId: profile.id,
        fullname: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value
      };
      
      return done(null, tempGoogleUser);
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Local Strategy (existing)
passport.use(new LocalStrategy(User.authenticate()));

// Serialization - updated to handle temp Google users
passport.serializeUser((user, done) => {
  if (user.isNewGoogleUser) {
    // For temporary Google users, store the temp data
    done(null, { tempGoogleUser: true, data: user });
  } else {
    // For regular users, use the standard serialization
    done(null, user._id || user.id);
  }
});

passport.deserializeUser(async (data, done) => {
  try {
    if (data && data.tempGoogleUser) {
      // Return temp Google user data
      return done(null, data.data);
    }
    
    // Check if data looks like an email (string with @)
    if (typeof data === 'string' && data.includes('@')) {
      // If it's an email, find by email instead of _id
      const user = await User.findOne({ email: data });
      return done(null, user);
    }
    
    // Standard deserialization for regular users with ObjectId
    const user = await User.findById(data);
    done(null, user);
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error, null);
  }
});

module.exports = passport;