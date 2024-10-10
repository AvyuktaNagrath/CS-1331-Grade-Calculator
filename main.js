// assignment class
class Assignment {
    constructor(date, details, due, type, totalPoints, inputId, canBeDropped = true) {
        this.date = date;
        this.details = details;
        this.due = new Date(due);
        this.type = type;
        this.totalPoints = totalPoints;
        this.inputId = inputId;
        this.canBeDropped = canBeDropped;
    }

    getScore() {
        // validate user input
        const score = parseFloat(document.getElementById(this.inputId).value) || 0;
        return score > this.totalPoints ? this.totalPoints : score;
    }
}

class GradeCalculator {
    constructor(assignments) {
        this.assignments = assignments;
        this.weights = {
            progExercises: 0.05,
            homework: 0.10,
            quizzes: 0.05,
            exams: 0.42,
            finalExam: 0.38,
        };
    }

    generateTable() {
        const table = document.getElementById('assignmentsTable').getElementsByTagName('tbody')[0];
        const currentTime = new Date();
    
        // sort assignments by type
        const sortedAssignments = this.assignments.sort((a, b) => a.type.localeCompare(b.type));
    
        sortedAssignments.forEach(assignment => {
            const row = document.createElement('tr');
            row.classList.add(assignment.type.toLowerCase()); // styling classes by type

            const dueDate = new Date(assignment.due);
            const isChecked = currentTime >= dueDate ? 'checked' : '';
    
            row.innerHTML = `
                <td>${assignment.date}</td>
                <td>${assignment.details}</td>
                <td>${assignment.type}</td>
                <td>${assignment.totalPoints}</td>
                <td><input type="number" id="${assignment.inputId}" min="0" max="${assignment.totalPoints}" placeholder="0/${assignment.totalPoints}"></td>
                <td><input type="checkbox" id="include_${assignment.inputId}" ${isChecked}></td>
            `;
            table.appendChild(row);
    
            // constant event listener to validate user input (i.e. 0 <= score input < 100)
            const inputElement = document.getElementById(assignment.inputId);
            inputElement.addEventListener('input', function() {
                if (parseFloat(this.value) > assignment.totalPoints) {
                    this.value = assignment.totalPoints;
                }
                if (parseFloat(this.value) < 0) {
                    this.value = 0;
                }
            });
        });
    }
    

    calculateFinalGrade() {
        let quizTotal = 0, peTotal = 0, hwTotal = 0, examTotal = 0; // earned points per category
        let quizMax = 0, peMax = 0, hwMax = 0, examMax = 0; // available points per category
        let finalExamScore = 0, finalExamMax = 0;
    
        // counters to ensure at least one assignment in each category is selected
        let quizCount = 0, peCount = 0, hwCount = 0, examCount = 0;
    
        // store PQs and dropped PQ details
        let quizScores = [];
        let droppedQuizzes = [];
    
        let syllabusQuizScore = 0;
        let syllabusQuizMax = 0;
    
        this.assignments.forEach(assignment => {
            const includeAssignment = document.getElementById(`include_${assignment.inputId}`).checked;
    
            if (includeAssignment) {
                const score = assignment.getScore();
                const maxScore = assignment.totalPoints;
    
                if (assignment.type === 'Quiz') {
                    quizCount++;
                    if (assignment.details.includes('Syllabus Quiz')) {
                        syllabusQuizScore = score;
                        syllabusQuizMax = maxScore;
                    } else {
                        quizScores.push({ score, maxScore, details: assignment.details, canBeDropped: assignment.canBeDropped });
                    }
                    quizTotal += score;
                    quizMax += maxScore;
                } else if (assignment.type === 'PE') {
                    peCount++;
                    peTotal += score;
                    peMax += maxScore;
                } else if (assignment.type === 'HW') {
                    hwCount++;
                    hwTotal += score;
                    hwMax += maxScore;
                } else if (assignment.type === 'Exam') {
                    examCount++;
                    examTotal += score;
                    examMax += maxScore;
                } else if (assignment.type === 'Final Exam') {
                    finalExamScore = score;
                    finalExamMax = maxScore;
                }
            }
        });
    
        // check if at least one item in each category is selected
        if (quizCount === 0 || peCount === 0 || hwCount === 0 || examCount === 0) {
            alert("Must have at least one item in each grading category selected.");
            return;
        }
    
        // drop 3 lowest PQs
        const droppableQuizzes = quizScores.filter(quiz => quiz.canBeDropped);
        if (droppableQuizzes.length > 3) {
            droppableQuizzes.sort((a, b) => a.score - b.score); // Ascending order
            const lowestQuizzes = droppableQuizzes.splice(0, 3); // Drop the lowest three
    
            droppedQuizzes = lowestQuizzes.map(quiz => quiz.details); // Get the details of dropped PQs
            quizTotal = droppableQuizzes.reduce((sum, quiz) => sum + quiz.score, 0);
            quizMax = droppableQuizzes.reduce((sum, quiz) => sum + quiz.maxScore, 0);
        }
    
        // re-add the Syllabus Quiz to the total after dropping other quizzes
        quizTotal += syllabusQuizScore;
        quizMax += syllabusQuizMax;
    
        const finalExamCompleted = finalExamMax > 0 && finalExamScore > 0;
        let totalWeight = finalExamCompleted ? 1.0 : (1.0 - this.weights.finalExam);
    
        const adjustedWeights = {
            progExercises: (this.weights.progExercises / totalWeight),
            homework: (this.weights.homework / totalWeight),
            quizzes: (this.weights.quizzes / totalWeight),
            exams: (this.weights.exams / totalWeight),
            finalExam: this.weights.finalExam,
        };
    
        const quizGrade = (quizTotal / (quizMax || 1));
        const peGrade = (peTotal / (peMax || 1));
        const hwGrade = (hwTotal / (hwMax || 1));
        const examGrade = (examTotal / (examMax || 1));
        const finalExamGrade = (finalExamScore / (finalExamMax || 1));
    
        const currentGrade = (quizGrade*adjustedWeights.quizzes + peGrade*adjustedWeights.progExercises + hwGrade*adjustedWeights.homework + examGrade*adjustedWeights.exams + (finalExamCompleted*adjustedWeights.finalExam ? finalExamGrade : 0)) * 100;
        const gradeWithFinalAsZero = (quizGrade*this.weights.quizzes + peGrade*this.weights.progExercises + hwGrade*this.weights.homework + examGrade*this.weights.exams) * 100;
    

        let resultMessage = `Your current grade is: ${currentGrade.toFixed(2)}%`;
    
        // displays scores for various grading thresholds (man i love ternary operator)
        for (let i = 90; i >= 70; i -= 10) {
            let y = (i - gradeWithFinalAsZero) / this.weights.finalExam;
            const resultText = (y > 100) ? "Not possible" : `${y.toFixed(2)}%`;
        
            resultMessage += (i === 70)
                ? `<br>Final exam grade necessary to pass: ${resultText}`
                : `<br>Final exam grade necessary to get a ${i}: ${resultText}`;
        }
        
    
        if (droppedQuizzes.length > 0) {
            resultMessage += `<br><br>The following Participation Quizzes were dropped:<br> ${droppedQuizzes.join('<br>')}`;
        }
    
        document.getElementById('result').innerHTML = resultMessage;
    
        // send scores to html
        document.getElementById('sectionScores').innerHTML = `
            <h3>Section Scores:</h3>
            <p>Quizzes: ${(quizGrade * 100).toFixed(2)}%</p>
            <p>Programming Exercises: ${(peGrade * 100).toFixed(2)}%</p>
            <p>Homework: ${(hwGrade * 100).toFixed(2)}%</p>
            <p>Exams: ${(examGrade * 100).toFixed(2)}%</p>
            <p>Final Exam: ${(finalExamCompleted ? (finalExamGrade * 100).toFixed(2) : 'N/A')}%</p>
        `;
    }
    
}

// assignments currently
const assignments = [
    new Assignment('Fri, Aug 23, 2024', 'Quiz 01) Java Introduction', '2024-08-23T16:45:00', 'Quiz', 5, 'quiz1'),
    new Assignment('Wed, Aug 28, 2024', 'Programming Exercise 00', '2024-08-28T20:00:00', 'PE', 5, 'pe0'),
    new Assignment('Wed, Aug 28, 2024', 'Syllabus Quiz', '2024-08-28T20:00:00', 'Quiz', 25, 'peSyllabus', false),
    new Assignment('Thu, Aug 29, 2024', 'Quiz 02) Type Conversion, Expressions, Program Control Flow', '2024-08-29T10:20:00', 'Quiz', 5, 'quiz2'),
    new Assignment('Wed, Sep 04, 2024', 'Programming Exercise 01', '2024-09-04T20:00:00', 'PE', 100, 'pe1'),
    new Assignment('Sat, Sep 07, 2024', 'Quiz 03) Iteration, Strings', '2024-09-07T10:20:00', 'Quiz', 5, 'quiz3'),
    new Assignment('Wed, Sep 11, 2024', 'Programming Exercise 02', '2024-09-11T20:00:00', 'PE', 100, 'pe2'),
    new Assignment('Thu, Sep 12, 2024', 'Quiz 04) Math, Random, Static Methods, Scanner, printf', '2024-09-12T16:00:00', 'Quiz', 5, 'quiz4'),
    new Assignment('Sat, Sep 14, 2024', 'Quiz 05) Arrays', '2024-09-14T10:20:00', 'Quiz', 5, 'quiz5'),
    new Assignment('Wed, Sep 18, 2024', 'Programming Exercise 03', '2024-09-18T20:00:00', 'PE', 100, 'pe3'),
    new Assignment('Fri, Sep 20, 2024', 'Exam 01', '2024-09-20T10:30:00', 'Exam', 100, 'exam1'),
    new Assignment('Tue, Sep 24, 2024', 'Quiz 06) Classes, Instances, Instance vs Static Methods, Visibility Modifiers', '2024-09-24T10:20:00', 'Quiz', 5, 'quiz6'),
    new Assignment('Wed, Sep 25, 2024', 'Programming Exercise 04', '2024-09-25T20:00:00', 'PE', 100, 'pe4'),
    new Assignment('Thu, Sep 26, 2024', 'Quiz 07) Constructors', '2024-09-26T10:20:00', 'Quiz', 5, 'quiz7'),
    new Assignment('Sat, Sep 28, 2024', 'Quiz 08) Wrapper Classes, Inheritance, Aliasing Revisited', '2024-09-28T10:20:00', 'Quiz', 5, 'quiz8'),
    new Assignment('Tue, Oct 1, 2024', 'Quiz 09) Advanced Inheritance', '2024-10-01T10:20:00', 'Quiz', 5, 'quiz9'),
    new Assignment('Wed, Oct 2, 2024', 'Homework 01', '2024-10-02T20:00:00', 'HW', 100, 'hw1'),
    new Assignment('Tue, Oct 8, 2024', 'Quiz 10) Object, Abstract Classes', '2024-10-08T10:20:00', 'Quiz', 5, 'quiz10'),
    new Assignment('Wed, Oct 9, 2024', 'Homework 02', '2024-10-09T20:00:00', 'HW', 100, 'hw2'),
    new Assignment('Thu, Oct 10, 2024', 'Quiz 11) Polymorphism', '2024-10-10T10:20:00', 'Quiz', 5, 'quiz11'),
    new Assignment('Wed, Oct 16, 2024', 'Homework 03', '2024-10-16T20:00:00', 'HW', 100, 'hw3'),
    new Assignment('Fri, Oct 18, 2024', 'Exam 02', '2024-10-18T10:30:00', 'Exam', 100, 'exam2'),
    new Assignment('Wed, Oct 23, 2024', 'Homework 04', '2024-10-23T20:00:00', 'HW', 100, 'hw4'),
    new Assignment('Wed, Oct 30, 2024', 'Homework 05', '2024-10-30T20:00:00', 'HW', 100, 'hw5'),
    new Assignment('Fri, Nov 01, 2024', 'Exam 03', '2024-11-01T10:30:00', 'Exam', 100, 'exam3'),
    new Assignment('Wed, Nov 06, 2024', 'Homework 06', '2024-11-06T20:00:00', 'HW', 100, 'hw6'),
    new Assignment('Wed, Nov 13, 2024', 'Homework 07', '2024-11-13T20:00:00', 'HW', 100, 'hw7'),
    new Assignment('Wed, Nov 20, 2024', 'Homework 08', '2024-11-20T20:00:00', 'HW', 100, 'hw8'),
    new Assignment('Tue, Dec 03, 2024', 'Homework 09', '2024-12-03T20:00:00', 'HW', 100, 'hw9'),
];



const gradeCalculator = new GradeCalculator(assignments);
gradeCalculator.generateTable();
