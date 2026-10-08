interface DeliveryUser {
  userName: string;
  isExpress: boolean;
  hasFreeShippingCoupon: boolean;
}


export default function HomePage(): React.JSX.Element {
  const user: DeliveryUser = {
    userName: "최지훈",
    isExpress: true,
    hasFreeShippingCoupon: true,
  };


  return (
    <div className="p-3">
      <h1 className="text-2xl font-bold">
        {user.userName}님의 배송 안내
      </h1>

      <p className="mt-2">
        {user.isExpress ? "당일 급송 배송" : "일반 택배 배송"}
      </p>

      {user.hasFreeShippingCoupon && (
        <p>무료 배송 쿠폰 적용 대상입니다</p>
      )}
    </div>
  );
}