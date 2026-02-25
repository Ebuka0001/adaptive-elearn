// seed.js — run once with: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');
const Question = require('./models/Question');
const Badge = require('./models/Badge');

async function seed() {
  await connectDB(process.env.MONGO_URI);

  // create badges
  const badges = [
    { name: 'Getting Started', description: 'Earn 50 points', condition: 'points_50' },
    { name: 'First Win', description: 'Answer first question correctly', condition: 'first_correct' }
  ];

  for (const b of badges) {
    const found = await Badge.findOne({ name: b.name });
    if (!found) await new Badge(b).save();
  }

  // create lecturer
  let lecturer = await User.findOne({ email: 'lecturer@example.com' });
  if (!lecturer) {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('LectPass123', 10);
    lecturer = await User.create({ name: 'Lecturer', email: 'lecturer@example.com', passwordHash, role: 'lecturer' });
    console.log('Created lecturer');
  }

  // create student
  let student = await User.findOne({ email: 'student1@example.com' });
  if (!student) {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('P@ssword123', 10);
    student = await User.create({ name: 'Student One', email: 'student1@example.com', passwordHash, role: 'student' });
    console.log('Created student');
  }

  // course
  let course = await Course.findOne({ title: 'Intro to Programming' });
  if (!course) {
    course = await Course.create({ title: 'Intro to Programming', description: 'Basics of programming', lecturer: lecturer._id });
    console.log('Created course');
  }

  // lesson
  let lesson = await Lesson.findOne({ title: 'Variables & Loops' });
  if (!lesson) {
    lesson = await Lesson.create({ title: 'Variables & Loops', content: 'Short notes on loops', course: course._id, concepts: ['variables','loops'], order: 1 });
    course.lessons.push(lesson._id);
    await course.save();
    console.log('Created lesson');
  }

  // questions
  const qdata = [
    { text: 'What is a variable?', type: 'short', answer: 'a container for data', difficulty: 1, concepts: ['variables'], points: 10 },
    { text: 'Which loop runs at least once?', type: 'short', answer: 'do-while', difficulty: 2, concepts: ['loops'], points: 10 },
    { text: 'Choose the correct type for whole numbers', type: 'mcq', choices: [{text:'float',correct:false},{text:'int',correct:true},{text:'string',correct:false}], difficulty: 1, concepts: ['types'], points: 10 },
    { text: 'What keyword creates a loop that repeats while a condition is true?', type: 'short', answer: 'while', difficulty: 2, concepts: ['loops'], points: 10 }
  ];

  for (const q of qdata) {
    const found = await Question.findOne({ text: q.text });
    if (!found) {
      const created = await Question.create(q);
      lesson.questions.push(created._id);
    }
  }

  await lesson.save();

  console.log('Seed complete — remember to remove or change seed data for production.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
