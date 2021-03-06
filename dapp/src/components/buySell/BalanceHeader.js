import React, { useState, useEffect } from 'react'
import { fbt } from 'fbt-runtime'
import { useStoreState } from 'pullstate'

import AccountStore from 'stores/AccountStore'
import AnimatedOusdStore from 'stores/AnimatedOusdStore'
import ContractStore from 'stores/ContractStore'
import { formatCurrency } from 'utils/math'
import { animateValue } from 'utils/animation'
import { usePrevious } from 'utils/hooks'

import DisclaimerTooltip from 'components/buySell/DisclaimerTooltip'
import useExpectedYield from 'utils/useExpectedYield'

const BalanceHeader = () => {
  const apy = useStoreState(ContractStore, (s) => s.apy || 0)
  const ousdBalance = useStoreState(AccountStore, (s) => s.balances['ousd'])
  const ousdBalanceLoaded = typeof ousdBalance === 'string'
  const animatedOusdBalance = useStoreState(
    AnimatedOusdStore,
    (s) => s.animatedOusdBalance
  )
  const mintAnimationLimit = 0.5
  const [balanceEmphasised, setBalanceEmphasised] = useState(false)
  const prevOusdBalance = usePrevious(ousdBalance)
  const [calculateDropdownOpen, setCalculateDropdownOpen] = useState(false)
  const addOusdModalState = useStoreState(
    AccountStore,
    (s) => s.addOusdModalState
  )
  const { animatedExpectedIncrease } = useExpectedYield()

  const normalOusdAnimation = (from, to) => {
    setBalanceEmphasised(true)
    return animateValue({
      from: parseFloat(from) || 0,
      to: parseFloat(to),
      callbackValue: (val) => {
        AnimatedOusdStore.update((s) => {
          s.animatedOusdBalance = val
        })
      },
      onCompleteCallback: () => {
        setBalanceEmphasised(false)
        if (addOusdModalState === 'waiting') {
          AccountStore.update((s) => {
            s.addOusdModalState = 'show'
          })
        }
      },
      // non even duration number so more of the decimals in ousdBalance animate
      duration: 1985,
      id: 'header-balance-ousd-animation',
      stepTime: 30,
    })
  }

  useEffect(() => {
    if (ousdBalanceLoaded) {
      const ousdBalanceNum = parseFloat(ousdBalance)
      const prevOusdBalanceNum = parseFloat(prevOusdBalance)
      // user must have minted the OUSD
      if (
        !isNaN(parseFloat(ousdBalanceNum)) &&
        !isNaN(parseFloat(prevOusdBalanceNum)) &&
        Math.abs(ousdBalanceNum - prevOusdBalanceNum) > mintAnimationLimit
      ) {
        normalOusdAnimation(prevOusdBalance, ousdBalance)
      } else if (
        !isNaN(parseFloat(ousdBalanceNum)) &&
        ousdBalanceNum > mintAnimationLimit
      ) {
        normalOusdAnimation(0, ousdBalance)
      }
    }
  }, [ousdBalance])

  const displayedBalance = formatCurrency(animatedOusdBalance || 0, 6)
  return (
    <>
      <div className="balance-header d-flex flex-column justify-content-center has-inaccurate-balance">
        {/* IMPORTANT when commenting this below part out also remove the "has-inaccurate-balance" parent css class */}
        <div className="inaccurate-balance">
          Please note that the Estimated OUSD Balance shown here is inaccurate
          and should not be relied upon. The{' '}
          <a
            href="https://medium.com/originprotocol/urgent-ousd-has-hacked-and-there-has-been-a-loss-of-funds-7b8c4a7d534c"
            target="_blank"
            rel="noopener noreferrer"
          >
            recent hack
          </a>{' '}
          of the OUSD vault triggered a malicious rebase that caused all OUSD
          balances to increase improperly. We discourage anyone from buying or
          selling OUSD until we make a determination for how the balances will
          be adjusted going forward.
        </div>
        <div className="d-flex justify-content-start">
          <div className="apy-container d-flex justify-content-center flex-column">
            <div className="contents d-flex flex-column align-items-start justify-content-center">
              <div className="light-grey-label apy-label">Trailing APY</div>
              <div className="apy-percentage">
                {typeof apy === 'number'
                  ? formatCurrency(apy * 100, 2)
                  : '--.--'}
              </div>
              <a
                href="https://analytics.ousd.com/apr"
                target="_blank"
                className="detail"
              >
                {fbt('Learn more', 'Learn more ')}&nbsp;&gt;
              </a>
            </div>
          </div>
          <div className="ousd-value-holder d-flex flex-column align-items-start justify-content-center">
            <div className="light-grey-label d-flex">
              {fbt('OUSD Balance', 'OUSD Balance')}
            </div>
            <div className={`ousd-value ${balanceEmphasised ? 'big' : ''}`}>
              {!isNaN(parseFloat(displayedBalance)) && ousdBalanceLoaded ? (
                <>
                  {' '}
                  {displayedBalance.substring(0, displayedBalance.length - 4)}
                  <span className="grey">
                    {displayedBalance.substring(displayedBalance.length - 4)}
                  </span>
                </>
              ) : (
                '--.----'
              )}
            </div>
            <div className="expected-increase d-flex flex-row align-items-center justify-content-center">
              <p>
                {fbt('Next expected increase', 'Next expected increase')}:{' '}
                <strong>{formatCurrency(animatedExpectedIncrease, 2)}</strong>
              </p>
              <DisclaimerTooltip
                id="howBalanceCalculatedPopover"
                isOpen={calculateDropdownOpen}
                smallIcon
                handleClick={(e) => {
                  e.preventDefault()
                  setCalculateDropdownOpen(!calculateDropdownOpen)
                }}
                handleClose={() => setCalculateDropdownOpen(false)}
                text={fbt(
                  `Your OUSD balance will increase when the next rebase event occurs. This amount is not guaranteed but it reflects the increase that would occur if rebase were to occur right now. The expected amount may decrease between rebases, but your actual OUSD balance should never go down.`,
                  `Your OUSD balance will increase when the next rebase event occurs. This amount is not guaranteed but it reflects the increase that would occur if rebase were to occur right now. The expected amount may decrease between rebases, but your actual OUSD balance should never go down.`
                )}
              />
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .balance-header {
          min-height: 200px;
          padding: 40px;
        }

        .balance-header.has-inaccurate-balance {
          min-height: auto;
        }

        .balance-header .inaccurate-balance {
          border: 2px solid #ed2a28;
          border-radius: 5px;
          color: #ed2a28;
          margin-bottom: 40px;
          padding: 15px;
        }

        .balance-header .inaccurate-balance a {
          text-decoration: underline;
        }

        .balance-header .light-grey-label {
          font-size: 14px;
          font-weight: bold;
          color: #8293a4;
          margin-bottom: -3px;
        }

        .balance-header .detail {
          font-size: 12px;
          color: #8293a4;
        }

        .balance-header a:hover {
          color: #183140;
        }

        .balance-header .ousd-value {
          font-size: 36px;
          color: #183140;
          transition: font-size 0.2s cubic-bezier(0.5, -0.5, 0.5, 1.5),
            color 0.2s cubic-bezier(0.5, -0.5, 0.5, 1.5);
          margin-bottom: 5px;
        }

        .balance-header .ousd-value.big {
          color: #00d592;
        }

        .balance-header .ousd-value .grey {
          color: #8293a4;
        }

        .balance-header .ousd-value::after {
          content: '';
          vertical-align: baseline;
          color: #183140;
          font-size: 14px;
          margin-left: 8px;
        }

        .balance-header .apy-container {
          height: 100%;
          margin-right: 40px;
          padding-right: 40px;
          border-right: solid 1px #cdd7e0;
        }

        .balance-header .apy-container .contents {
          z-index: 2;
        }

        .balance-header .apy-container .apy-percentage {
          font-size: 36px;
          text-align: center;
          color: #183140;
          margin-bottom: 5px;
        }

        .balance-header .apy-container .apy-percentage::after {
          content: '%';
          font-size: 16px;
          font-weight: bold;
          color: #183140;
          vertical-align: super;
          padding-left: 2px;
        }

        .balance-header .expected-increase {
          font-size: 12px;
          color: #8293a4;
        }

        .balance-header .expected-increase p {
          margin: auto;
        }

        .balance-header .expected-increase .dropdown {
          justify-content: center !important;
        }

        .balance-header .expected-increase .dropdown .disclaimer-tooltip {
          display: flex !important;
        }

        @media (max-width: 799px) {
          .balance-header {
            align-items: center;
            text-align: center;
            padding: 0px 20px;
            min-height: 140px;
          }

          .balance-header .apy-container {
            width: 100px;
            margin-right: 19px;
          }

          .balance-header .gradient-border {
            width: 100px;
            height: 100px;
            margin-right: 20px;
            padding-right: 20px;
          }

          .balance-header .ousd-value {
            font-size: 23px;
            margin-bottom: 0px;
          }

          .balance-header .ousd-value .grey {
            color: #8293a4;
          }

          .balance-header .apy-container .apy-label {
            font-family: Lato;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            color: #8293a4;
          }

          .balance-header .apy-container .apy-percentage {
            font-family: Lato;
            font-size: 23px;
            color: #1e313f;
            font-weight: normal;
          }

          .balance-header .apy-container .apy-percentage::after {
            content: '%';
            font-size: 14px;
            vertical-align: text-top;
          }

          .balance-header .ousd-value::after {
            content: '';
          }

          .balance-header .light-grey-label {
            font-family: Lato;
            font-size: 11px;
            font-weight: bold;
            color: #8293a4;
            margin-bottom: -2px;
          }

          .ousd-value-holder {
            margin-bottom: 5px;
          }
        }
      `}</style>
    </>
  )
}

export default BalanceHeader
