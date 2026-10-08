interface ProductOrder {
  productName: string;
  unitPrice: number;
  quantity: number;
  isPrimeMember: boolean;
  canUsesDiscount: boolean;
}


export default function HomePage(): React.JSX.Element {
  const order: ProductOrder = {
    productName: "아이폰17",
    unitPrice: 18000,
    quantity: 4,
    isPrimeMember: true,
    canUsesDiscount: true
  }

  return (
    <>
      <div className="p-3">
        <h1 className="text-2xl font-bold">
          {order.productName}
        </h1>
        {order.isPrimeMember ? (<p>프라임 우대 회원</p>) : (<p>일반 회원</p>)}

        {order.canUsesDiscount && (
          <p>추가 할인 혜택이 적용 가능합니다</p>
        )}
        <hr />
        <p>
          총 주문 금액: {order.unitPrice * order.quantity}
        </p>
      </div>
    </>
  );
}