// 1번 문제
class smartphone {
    constructor(name, price) {
        this.name = name;
        this.price = price;
    }
    getInfo() {
        return `${this.name}의 가격은 ${this.price}원입니다.`;
    }
}

class smartphone1 extends smartphone {
    constructor(name, price, telecom) {
        super(name, price);
        this.telecom = telecom;
    }
    getTelecom() {
        return `${this.telecom}`;
    }
}

const phone = new smartphone1("갤럭시", 1200000, "SKT");

console.log(phone.getInfo());

// 2번문제 
const student = {
    name: "철수",
    score: 90
};

Object.freeze(student);

student.score = 50;
delete student.name;

console.log(student);


//3번 문제
const trip = {
    city: "부천",
    schedule: {
        day1: "부천역"
    }
};
const copy = JSON.parse(JSON.stringify(trip));
copy.schedule.day1 = "신중동";

console.log(trip.schedule.day1);
console.log(copy.schedule.day1);