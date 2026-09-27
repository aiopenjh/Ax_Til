let leftCup = "주스";
let rightCup = "우유";

let emptyCup = leftCup;
leftCup = rightCup;
rightCup = emptyCup;

console.log(leftCup, rightCup)

// ------------------------------------------------

let enteredAge = "19";
console.log(typeof enteredAge);

let requiredAge = 19;
console.log(typeof requiredAge);

console.log(enteredAge === requiredAge);

let isEligible =
    typeof enteredAge === typeof requiredAge && enteredAge === requiredAge;

console.log(isEligible);

// ------------------------------------------------

let currentYear = 2028;

console.log(currentYear % 4 === 0);
currentYear += 2;
console.log(currentYear);
console.log(currentYear % 4 === 0);