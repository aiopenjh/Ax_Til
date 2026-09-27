// 호이스팅 사전 방어
// console.log(userAge); // 주석 해제 시 에러 발생 (ReferenceError: Cannot access 'userAge' before initialization)
let userAge = 25;

// 블록 레벨 외부 호출 제한
if (true) {
    let localData = "지역 데이터";
    console.log(localData); // 정상 출력
}
// console.log(localData); // 주석 해제 시 에러 발생 (ReferenceError: localData is not defined)

// 상수 재할당 제한
const apiEndpoint = "https://server.com/v1";
// apiEndpoint = "https://server.com/v2"; // 주석 해제 시 에러 발생 (TypeError: Assignment to constant variable)