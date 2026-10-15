// The shape of one grocery item. TypeScript checks every use of it.
export interface Item {
  id: string;
  name: string;
  qty: number;
  price: number; // price per unit
  checked: boolean; // true = already in the cart
}
