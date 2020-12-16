import React, { useEffect, useState } from 'react'
import { fbt } from 'fbt-runtime'
import { useWeb3React } from '@web3-react/core'
import { useStoreState } from 'pullstate'
import ethers from 'ethers'

import StakeStore from 'stores/StakeStore'
import Layout from 'components/layout'
import Nav from 'components/Nav'
import { formatCurrency } from 'utils/math'
import ContractStore from 'stores/ContractStore'

export default function DApp({ locale, onLocale }) {
  const { active, account } = useWeb3React()
  const [compensationData, setCompensationData] = useState(null)
  const [displayAdjustmentWarning, setDisplayAdjustmentWarning] = useState(true)
  const [accountConnected, setAccountConnected] = useState(false)
  const airDroppedOgnClaimed = useStoreState(StakeStore, (s) => s.airDropStakeClaimed)
  const { ognStaking } = useStoreState(ContractStore, (s) => {
    if (s.contracts) {
      return s.contracts
    }
    return {}
  })

  const fetchCompensationInfo = async (wallet) => {
    const result = await fetch(
      `${location.origin}/api/compensation?wallet=${wallet}`
    )
    if (result.ok) {
      setCompensationData(await result.json())
    } else {
      // TODO: handle error or no complensation available
      setCompensationData(null)
    }
  }

  useEffect(() => {
    if (active && account) {
      fetchCompensationInfo(account)
      setAccountConnected(true)
    }else {
      setAccountConnected(false)
    }
  }, [active, account])

  return (
    <>
      <Layout locale={locale} onLocale={onLocale} dapp medium>
        <Nav dapp page={'compensation'} locale={locale} onLocale={onLocale} />
        <div className="home d-flex flex-column">
          <div className="d-flex align-items-center flex-column flex-md-row">
            <div className="bold-text mr-md-3">
              {fbt('OUSD Exploit Compensation', 'OUSD Exploit Compensation')}
            </div>
            <div className="grey-text-link d-flex align-items-center">
              {fbt(
                'How is my compensation calculated?',
                'How is compensation calculated'
              )}
            </div>
          </div>
          <div className="widget-holder row">
            <div className="top-balance-widget d-flex align-items-center justify-content-center flex-column">

            {!accountConnected ? (<div className="not-connected d-flex align-items-center justify-content-center flex-column"> 
              <img className="wallet-icons" src="/images/wallet-icons.svg" />
                <h3>Connect a cryptowallet to see your compensation</h3>
                <button className="btn btn-primary" onClick={async (e) => {}}>
                    {fbt('Connect', 'Connect')}
                  </button>
              </div>) : compensationData ? (
                <>
                  <div className="eligible-text">
                    <p>{fbt('OUSD balance at block 11272254', 'OUSD balance at block')}</p>
                    <h1>1,234.56</h1>
                  </div>
                  <div className="widget-message mt-auto w-100">
                    <p>Compensation for <strong>100% of this OUSD balance</strong> is split evenly 50/50 as shown below</p>
                  </div>
                </>
              ) : (
                <h1 className="not-eligible-text">
                  {fbt('This wallet is not eligible for compensation', 'This wallet is not eligible for compensation')}
                </h1>
              )}
            </div>
            <div className={`ousd-widget col-md-6 d-flex align-items-center flex-column${!accountConnected ? ' big-top-widget': ''}`}>
              <img className="ousd-coin" src="/images/ousd-coin-big.svg" />
              <div className="widget-title bold-text">
                {fbt('OUSD Compensation Amount', 'OUSD Compensation Amount')}
              </div>
              {accountConnected && compensationData ? (
                <>
                  <div className="token-amount">
                    {formatCurrency(
                      ethers.utils.formatUnits(compensationData.account.amount, 18),
                      2
                    )}
                  </div>
                  <p>{fbt('Available now', 'Available now')}</p>
                  <button className="btn btn-primary" onClick={async (e) => {}}>
                    {fbt('Claim OUSD', 'Claim OUSD')}
                  </button>
                </>
              ) : (
                <>
                  <div className="token-amount">0.00</div>
                </>
              )}
            </div>
            <div className={`ogn-widget col-md-6 d-flex align-items-center flex-column${accountConnected ? airDroppedOgnClaimed ? ' claimed' : '' : ' big-top-widget'}`}>
              <img className="ogn-coin" src="/images/ogn-coin-big.svg" />
              <div className="widget-title bold-text">
                {fbt('OGN Compensation Amount', 'OGN Compensation Amount')}
              </div>
              {accountConnected && compensationData ? (
                <>
                  <div className="token-amount">
                    {formatCurrency(
                      ethers.utils.formatUnits(compensationData.account.amount, 18),
                      2
                    )}
                  </div>
                  <div className="price-and-stake d-flex ">
                    <p>{fbt('@ OGN price of', '@ OGN price of')} $0.15</p>
                    <span> | </span>
                    <p>{fbt('Staking duration', 'Staking duration')}: 360 days</p>
                  </div>
                  {airDroppedOgnClaimed ? <h3>{fbt('CLAIMED', 'CLAIMED')}</h3> : <>
                    <button
                      className="btn btn-dark"
                      onClick={async (e) => {
                        const result = await ognStaking.airDroppedStake(
                          compensationData.account.index,
                          compensationData.account.type,
                          compensationData.account.duration,
                          compensationData.account.rate,
                          compensationData.account.amount,
                          compensationData.account.proof
                        )
                      }}
                    >
                      {fbt('Claim & Stake OGN', 'Claim & Stake OGN button')}
                    </button>
                  </>}
                </>
              ) : (
                <>
                  <div className="token-amount">0.00</div>
                </>
              )}
              <a>{fbt('Learn about OGN >', 'Learn about OGN')}</a> 
            </div>
          </div>
          {displayAdjustmentWarning && (
            <div className="adjustment-warning d-flex justify-content-center">
              <p>
              {fbt('These amounts have been adjusted based on your trading activity after the OUSD exploit', 'These amounts have been adjusted based on your trading activity after the OUSD exploit')}
              </p>
            </div>
          )}
        </div>
      </Layout>
      <style jsx>{`
        .home {
          padding: 80px 10px 0px;;
        }

        .bold-text {
          font-size: 14px;
          font-weight: bold;
          color: white;
        }

        .grey-text-link {
          font-size: 14px;
          color: #8293a4;
        }

        .grey-text-link:after {
          content: '';
          background-image: url(/images/link-icon-grey.svg);
          background-size: 14px 14px;
          display: inline-block;
          width: 14px;
          height: 14px;
          margin-left: 7px;
        }

        .grey-text-link:hover {
          cursor: pointer;
          text-decoration: underline;
        }

        .top-balance-widget {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          min-height: 178px;
          color: #000;
          border-radius: 10px;
          border: solid 1px #cdd7e0;
          background-color: #ffffff;
          z-index: 1;
          overflow: hidden;
        }

        .not-connected .wallet-icons {
          padding: 49px 10px 23px; 
          margin: 0px;
        }

        .not-connected h3 {
          text-align: center; 
          margin: 0px; 
          padding: 0px 10px;
          font-family: Lato;
          font-size: 22px;
          line-height: 0.86;
        }

        .not-connected .btn {
          margin: 45px 10px;
          width: 201px;
          height: 50px;
        }

        .eligible-text {
          padding: 35px 0px 0px;
          text-align: center;
        }

        .not-eligible-text {
          font-family: Lato;
          font-size: 28px;
          margin: 0px;
          padding: 10px;
        }

        .top-balance-widget p {
          margin: 0px;
          font-size: 0.86rem;
          font-weight: bold;
          color: #8293a4;
          margin-bottom: 8px;
        }

        .widget-message {
          background-color: #fafbfc;
          border-top: solid 1px #cdd7e0;
        }

        .widget-message p {
          padding: 10px;
          text-align: center;
          margin: 0px;
          font-size: 0.86rem;
          color: #8293a4;
          font-weight: normal;
        }

        .widget-message strong {
          color: #000;
        }

        .widget-holder {
          margin: 20px 0;
          position: relative;
          color: white;
        }

        .ousd-widget {
          background-color: #183140;
          border-radius: 10px 0px 10px 10px;
          padding: 232px 10px 40px;
          box-shadow: 0 0 14px 0 rgba(0, 0, 0, 0.1);
          border: solid 1px #000000;
        }

        .ousd-widget p {
          margin-bottom: 33px;
          font-size: 14px;
          opacity: 0.8;adjustment-warning
        }

        .ogn-widget {
          background-color: #1a82ff;
          border-radius: 0px 10px 10px 10px;
          padding: 232px 10px 40px;
          box-shadow: 0 0 14px 0 rgba(0, 0, 0, 0.1);
          border: solid 1px #065ac0;
        }

        .ogn-widget h3 {
          font-family: Lato;
          font-size: 18px;
          font-weight: bold;
          line-height: normal;
          margin: 0px;
        }

        .ogn-widget a {
          margin-top: 22px; 
          opacity: 0.8; 
          font-size: 14px;
        }
        
        .ogn-coin, .ousd-coin {
          margin-bottom: 17px;
        }

        .token-amount {
          font-family: Lato;
          font-size: 42px;
          color: #fff;
          line-height: normal;
          text-align: center;
        }

        .price-and-stake {
          opacity: 0.8; 
          font-size: 14px;
        }

        .price-and-stake p {
          margin: 0px;
        }

        .price-and-stake span {
          padding: 0px 10px;
        }

        .widget-holder .btn {
          padding-left: 28px;
          padding-right: 28px;
          min-width: 211px;
          border-radius: 25px;  
          font-family: Lato;
          font-size: 18px;
          font-weight: bold;
        }

        .widget-holder .btn-primary {    
          background-color: #1a82ff;
          border-color: #1a82ff;
        }

        .price-and-stake {
          margin-bottom: 33px;
        }

        .adjustment-warning {
          border-radius: 5px;
          border: solid 1px #fec100;
          background-color: rgba(254, 193, 0, 0.1);
        }

        .adjustment-warning p {
          color: #183140;
          margin: 0pc;
          padding: 8px;
          font-size: 14px;
          text-align: center;
        }

        .claimed .widget-title, .claimed .price-and-stake {
          opacity: 0.5;
        }

        .claimed .token-amount {
          text-decoration: line-through;
          opacity: 0.5;
        }

        .big-top-widget {
          padding: 400px 10px 40px;
        }

        @media (max-width: 768px) {
          .home {
            padding: 80px 0 0;
          }

          .top-balance-widget {
            position: relative; 
            border-radius: 0px;
          }

          .ousd-widget, .ogn-widget {
            padding: 40px 10px; 
            border-radius: 0px;
          }

          .adjustment-warning {
            margin: 0px 5px;
          }

          .eligible-text{
            padding: 35px 0;
          }
        }
      `}</style>
    </>
  )
}
