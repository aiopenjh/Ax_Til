// 1번문제

const book = {};
book.title = "자바스크립트 기초"
book.price = 20000;
book.quantity = 5;

book.getSum = function () {
    return this.price * this.quantity;
}
console.log(book.getSum());


book.price = 25000;
delete book.quantity;
console.log(book);

//2번 문제
const waitingList = ["철수", "영희", "민수"];
waitingList.push("지수");
waitingList.unshift("정우");

const subList = waitingList.slice(1, 3);
console.log(waitingList.join("/"));

console.log(waitingList.length);

//3번 심화문제
const luckyNumber = Math.floor(Math.random() * 10) + 1;

const luckyMember = {
    name: "홍길동",
    number: luckyNumber
};

const jsonData = JSON.stringify(luckyMember, null, 2);

console.log(typeof jsonData);
console.log(jsonData);