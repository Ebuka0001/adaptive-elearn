// seedExtraQuestions.js
// Run with: node seedExtraQuestions.js
require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI missing in .env. Add it or run from project root with .env present.');
  process.exit(1);
}

const questions = [
  { text: 'What is a variable?', type: 'short', answer: 'a container for data', difficulty: 1, concepts: ['variables'], points: 10 },
  { text: 'Choose the correct type for whole numbers', type: 'mcq', choices: [{text:'float', correct:false},{text:'int', correct:true},{text:'string', correct:false}], difficulty:1, concepts: ['types'], points: 10 },
  { text: 'What is 2+2?', type: 'mcq', choices: [{text:'3',correct:false},{text:'4',correct:true},{text:'5',correct:false}], difficulty:1, concepts: ['arithmetic'], points: 5 },
  { text: 'Choose the correct operator for equality in JavaScript', type: 'mcq', choices: [{text:'=', correct:false},{text:'==', correct:true},{text:'===', correct:false}], difficulty:2, concepts: ['operators'], points: 10 },
  { text: 'What is a loop used for?', type: 'short', answer: 'repeat code', difficulty:1, concepts: ['loops'], points: 10 },
  { text: 'Which data structure is LIFO?', type: 'mcq', choices: [{text:'Queue',correct:false},{text:'Stack',correct:true},{text:'Tree',correct:false}], difficulty:2, concepts: ['data_structures'], points: 10 },
  { text: 'What does HTML stand for?', type: 'short', answer: 'hypertext markup language', difficulty:1, concepts: ['html'], points: 5 },
  { text: 'Which tag creates a paragraph in HTML?', type: 'mcq', choices: [{text:'<p>',correct:true},{text:'<div>',correct:false},{text:'<span>',correct:false}], difficulty:1, concepts: ['html'], points: 5 },
  { text: 'What is 10 / 2?', type: 'short', answer: '5', difficulty:1, concepts: ['arithmetic'], points: 5 },
  { text: 'What is the result of 3 * 3?', type: 'mcq', choices: [{text:'6',correct:false},{text:'9',correct:true},{text:'12',correct:false}], difficulty:1, concepts: ['arithmetic'], points: 5 }
];

async function run() {
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected');

  // avoid duplicates: insert only if similar text not present
  for (const q of questions) {
    const exists = await Question.findOne({ text: q.text });
    if (exists) {
      console.log('Skipping (exists):', q.text);
      continue;
    }
    const doc = new Question(q);
    await doc.save();
    console.log('Created:', q.text);
  }

  console.log('SeedExtra complete');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('SeedExtra error:', err);
  process.exit(1);
});
