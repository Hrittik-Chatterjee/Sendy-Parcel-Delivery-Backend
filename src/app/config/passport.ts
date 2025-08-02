import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { envVars } from "./env";
import passport from "passport";
import { User } from "../modules/user/user.model";
import { Role } from "../modules/user/user.interface";
import { Strategy as LocalStrategy } from "passport-local";

import bcryptjs from "bcryptjs";

// custom
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email: string, password: string, done) => {
      try {
        const isUserExists = await User.findOne({ email });
        if (!isUserExists) {
          return done("User Doesn't Exits");
        }

        const isGoogleAuthenticated = isUserExists.auths.some(
          (providerObjects) => providerObjects.provider === "google"
        );

        if (isGoogleAuthenticated && !isUserExists.password) {
          return done(null, false, {
            message:
              "You Have Authenticated Through Google Login, if you want to login with credentials then try login with google and set a password",
          });
        }
        const isPasswordMatched = await bcryptjs.compare(
          password!,
          isUserExists.password!
        );
        if (!isPasswordMatched) {
          return done(null, false, { message: "Password Doesn't Match" });
        }

        return done(null, isUserExists);
      } catch (error) {
        done(error);
      }
    }
  )
);

// google
passport.use(
  new GoogleStrategy(
    {
      clientID: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackURL: envVars.GOOGLE_CALLBACK_URL,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(null, false, { message: "No Email Found" });
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            name: profile.displayName,
            picture: profile.photos?.[0].value,
            role: Role.SENDER,
            isVerified: true,
            auths: [
              {
                provider: "google",
                providerId: profile.id,
              },
            ],
          });
        }

        return done(null, user, { message: "User Created Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done: (err: any, id?: unknown) => void) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.log(error);
    done(error);
  }
});
