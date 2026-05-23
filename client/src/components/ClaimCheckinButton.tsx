import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

export function ClaimCheckinButton() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const handleClaim = async () => {
    if (!wallet) return alert('Vui lòng kết nối ví TON');
    const contractAddress = import.meta.env.VITE_BIRD_REWARD_CONTRACT;
    if (!contractAddress) return alert('Chưa cấu hình địa chỉ contract trong .env');
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: contractAddress,
          amount: '50000000', // 0.05 TON fee
          payload: 'base64:...' // TODO: Encode payload gọi claimCheckin
        }
      ]
    });
  };

  return (
    <>
      <TonConnectButton />
      <button onClick={handleClaim}>Điểm danh nhận Bird</button>
    </>
  );
}
