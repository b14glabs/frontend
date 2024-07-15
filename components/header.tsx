'use client';
import { CopyWrapper } from '@/components/copy-wrapper';
import { House } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { shortenString } from '@/utils/string';
import Link from 'next/link';

export const Header = () => {
  const { account, connect, address } = useOkxWalletContext();
  return (
    <>
      <div className="w-full mt-4 container flex justify-between items-center">
        <Link href="/">
          <House size={30} />
        </Link>
        <HoverCard openDelay={200}>
          {account ? (
            <HoverCardTrigger asChild>
              <Button variant={'default'} className="text-base">
                {shortenString(address)}
              </Button>
            </HoverCardTrigger>
          ) : (
            <Button variant={'default'} onClick={connect} className="text-base">
              Connect wallet
            </Button>
          )}
          <HoverCardContent className="w-44 space-y-4 text-sm">
            <div>
              <CopyWrapper value={address}>
                {shortenString(address)}
              </CopyWrapper>
            </div>
            <Separator />
            <div>
              <Link href="/my-restaking">My restaking</Link>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      <Separator className="mt-2" />
    </>
  );
};
