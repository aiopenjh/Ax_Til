//1번 문제
// function greetUser(name, age) {
//     return `안녕하세요, ${name}님! ${age}세가 되신 것을 진심으로 축하합니다.`;
// };

// const name = "최지훈";
// const age = 37;

// const result = greetUser(name, age);
// console.log(result);


// //2번 문제 
// function performCalculation(num1, num2, callback) {
//     return callback(num1, num2);
// }

// const add = (a, b) => a + b;
// const multiply = (a, b) => a * b;

// console.log(performCalculation(12, 4, add));
// console.log(performCalculation(12, 4, multiply));

// 3번 문제
function createPiggyBank() {
    let balance = 0;
    function deposit(amount) {
        balance += amount;
    }
    function getbalance() {
        return balance;
    }
    return { deposit, getbalance };
}


const myPiggyBank = createPiggyBank();
myPiggyBank.deposit(1500);
console.log(myPiggyBank.getbalance());