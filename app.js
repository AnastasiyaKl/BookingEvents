const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

app.use(bodyParser.json());

const user = (userId) => {
  return User.findById(userId)
    .then((user) => {
      console.log(user)
      return {
        ...user._doc,
        _id: user.id,
        createdEvents: events.bind(this, user._doc.createdEvents),
      };
    })
    .catch((err) => console.log(err));
};

const events = (eventIds) => {
  return User.find({ _id: { $in: eventIds } })
    .then((events) => {
      return events.map((event) => {
        return {
          ...event._doc,
          _id: event.id,
          creator: user.bind(this, event._doc.creator),
        };
      });
    })
    .catch((err) => {
      throw err;
    });
};

app.use(
  '/graphql',
  graphqlHttp({
    schema: buildSchema(`
		type Event {
			_id: ID!
			title: String!
			description: String!
			price: Float!
			date: String!
			creator: User!
		}
		
		type User {
		  _id: ID!
			email: String!
			password: String
			createdEvents: [Event!]
		}
		
		input EventInput {
			title: String!
			description: String!
			price: Float!
			date: String!
		}
		
		input UserInput {
			email: String!
			password: String!
		}
		
		type RootQuery {
			events: [Event!]!
		}
		
		type RootMutation {
			createEvent(eventInput: EventInput): Event
			createUser(userInput: UserInput): User
		}
		
		schema {
			query: RootQuery
			mutation: RootMutation
		}
	`),
    rootValue: {
      events: () => {
        return Event.find()
          .populate('creator')
          .then((events) => {
            return events.map((event) => {
              return {
                ...event._doc,
                _id: event.id,
                creator: user.bind(this, event._doc.creator),
              };
            });
          })
          .catch((err) => {
            console.log(err);
          });
      },
      createEvent: (args) => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: '5e80aa1fed14246c89f60f72',
        });
        let createdEvent;

        return event
          .save()
          .then((result) => {
            createdEvent = { ...result._doc, _id: result._doc._id.toString() };
            return User.findById('5e80aa1fed14246c89f60f72');
          })
          .then((user) => {
            if (!user) {
              throw new Error('No user with such ID');
            }
            user.createdEvents.push(event);
            return user.save();
          })
          .then((user) => {
            return createdEvent;
          })
          .catch((err) => console.log(err));
      },
      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            if (user) {
              throw new Error('User with such email is already exists');
            }
            return bcrypt.hash(args.userInput.password, 12);
          })
          .then((hashedPassword) => {
            const user = new User({
              email: args.userInput.email,
              password: hashedPassword,
            });
            return user.save();
          })
          .then((res) => {
            return { ...res._doc, id: res.id };
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-lzz6v.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
