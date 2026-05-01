# Shipping Display Update

Replace lines 1863-1877 in CheckoutScreen.tsx with:

```tsx
                  {/* Shipping Breakdown (with 18% GST) */}
                  {isCalculatingShipping ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Shipping</span>
                      <span className="text-blue-400 text-xs flex items-center gap-1">
                        <span className="animate-pulse">●</span>
                        Calculating...
                      </span>
                    </div>
                  ) : !address ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Shipping</span>
                      <span className="text-gray-500 text-xs">Enter shipping address</span>
                    </div>
                  ) : shippingCost === 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Shipping</span>
                      <span className="text-emerald-400">Free</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Shipping</span>
                        <span className="text-gray-200">₹{shippingExGST.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Shipping GST @ 18%</span>
                        <span className="text-gray-200">₹{shippingGST.toFixed(2)}</span>
                      </div>
                    </>
                  )}
```
