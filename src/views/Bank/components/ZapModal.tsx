import React, {useState, useMemo} from 'react';

import {Button, Select, MenuItem, InputLabel, Typography, withStyles} from '@material-ui/core';
// import Button from '../../../components/Button'
import Modal, {ModalProps} from '../../../components/Modal';
import ModalActions from '../../../components/ModalActions';
import ModalTitle from '../../../components/ModalTitle';
import TokenInput from '../../../components/TokenInput';
import styled from 'styled-components';

import {getDisplayBalance} from '../../../utils/formatBalance';
import Label from '../../../components/Label';
import useLpStats from '../../../hooks/useLpStats';
import useTokenBalance from '../../../hooks/useTokenBalance';
import useGrapeFinance from '../../../hooks/useGrapeFinance';
import {useWallet} from 'use-wallet';
import useApproveZapper, {ApprovalState} from '../../../hooks/useApproveZapper';
import {GRAPE_TICKER, WINE_TICKER, MIM_TICKER} from '../../../utils/constants';
import {Alert} from '@material-ui/lab';

interface ZapProps extends ModalProps {
  onConfirm: (zapAsset: string, lpName: string, amount: string) => void;
  tokenName?: string;
  decimals?: number;
}

const ZapModal: React.FC<ZapProps> = ({onConfirm, onDismiss, tokenName = '', decimals = 18}) => {
  const grapeFinance = useGrapeFinance();
  //const {balance} = useWallet();

  const grapeBalance = useTokenBalance(grapeFinance.GRAPE);
  const wineBalance = useTokenBalance(grapeFinance.WINE);
  const mimBalance = useTokenBalance(grapeFinance.MIM);

  //const avaxDisplayBalance = (Number(balance) / 1e18).toFixed(4).toString();

  const [val, setVal] = useState('');
  const [zappingToken, setZappingToken] = useState(MIM_TICKER);
  const [zappingTokenBalance, setZappingTokenBalance] = useState(getDisplayBalance(mimBalance, decimals));
  const [estimate, setEstimate] = useState({token0: '0', token1: '0'}); // token0 will always be MIM in this case
  const [approveZapperStatus, approveZapper] = useApproveZapper(zappingToken);
  const grapemimLpStats = useLpStats('GRAPE-MIM-LP');
  const wineSharemimLpStats = useLpStats('WINE-MIM-LP');
  const grapeLPStats = useMemo(() => (grapemimLpStats ? grapemimLpStats : null), [grapemimLpStats]);
  const wineLPStats = useMemo(() => (wineSharemimLpStats ? wineSharemimLpStats : null), [wineSharemimLpStats]);
  const mimAmountPerLP = tokenName.startsWith(GRAPE_TICKER) ? grapeLPStats?.mimAmount : wineLPStats?.mimAmount;
  /**
   * Checks if a value is a valid number or not
   * @param n is the value to be evaluated for a number
   * @returns
   */
  function isNumeric(n: any) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  const handleChangeAsset = (event: any) => {
    const value = event.target.value;
    setZappingToken(value);
    setZappingTokenBalance(getDisplayBalance(mimBalance, decimals));
    if (event.target.value === WINE_TICKER) {
      setZappingTokenBalance(getDisplayBalance(wineBalance, decimals));
    }
    if (event.target.value === GRAPE_TICKER) {
      setZappingTokenBalance(getDisplayBalance(grapeBalance, decimals));
    }
    if (event.target.value === MIM_TICKER) {
      setZappingTokenBalance(getDisplayBalance(mimBalance, decimals));
    }
  };

  const handleChange = async (e: any) => {
    if (e.currentTarget.value === '' || e.currentTarget.value === 0) {
      setVal(e.currentTarget.value);
      setEstimate({token0: '0', token1: '0'});
    }
    if (!isNumeric(e.currentTarget.value)) return;
    setVal(e.currentTarget.value);
    const estimateZap = await grapeFinance.estimateZapIn(zappingToken, tokenName, String(e.currentTarget.value));
    setEstimate({token0: estimateZap[0].toString(), token1: estimateZap[1].toString()});
  };

  const handleSelectMax = async () => {
    setVal(zappingTokenBalance);
    const estimateZap = await grapeFinance.estimateZapIn(zappingToken, tokenName, String(zappingTokenBalance));
    setEstimate({token0: estimateZap[0].toString(), token1: estimateZap[1].toString()});
  };

  return (
    <Modal>
      <ModalTitle text={`Zap in ${tokenName}`} />

      <StyledActionSpacer />
      <InputLabel style={{color: '#2c2560'}} id="label">
        Select asset to zap with
      </InputLabel>
      <Select onChange={handleChangeAsset} style={{color: '#2c2560'}} labelId="label" id="select" value={zappingToken}>
        <StyledMenuItem value={MIM_TICKER}>MIM</StyledMenuItem>
        <StyledMenuItem value={WINE_TICKER}>WINE</StyledMenuItem>
        <StyledMenuItem value={GRAPE_TICKER}>GRAPE</StyledMenuItem>
      </Select>
      <TokenInput
        onSelectMax={handleSelectMax}
        onChange={handleChange}
        value={val}
        max={zappingTokenBalance}
        symbol={zappingToken}
      />
      <Label text="Zap Estimations" />
      <StyledDescriptionText>
        {' '}
        {tokenName}: {Number(estimate.token0) / Number(mimAmountPerLP)}
      </StyledDescriptionText>
      <StyledDescriptionText>
        {' '}
        ({Number(estimate.token0)} {tokenName.startsWith(WINE_TICKER) ? WINE_TICKER : MIM_TICKER} /{' '}
        {Number(estimate.token1)} {tokenName.startsWith(WINE_TICKER) ? MIM_TICKER : WINE_TICKER}){' '}
      </StyledDescriptionText>
      <ModalActions>
        <Button
          color="primary"
          variant="contained"
          onClick={() =>
            approveZapperStatus !== ApprovalState.APPROVED ? approveZapper() : onConfirm(zappingToken, tokenName, val)
          }
        >
          {approveZapperStatus !== ApprovalState.APPROVED ? 'Approve' : "Let's go"}
        </Button>
      </ModalActions>

      <StyledActionSpacer />
      <Alert variant="filled" severity="info">
        You need to manually stake the LP tokens after zapping. This feature piggybacks off of the Piggy Finance zapper.
      </Alert>
    </Modal>
  );
};

const StyledActionSpacer = styled.div`
  height: ${(props) => props.theme.spacing[4]}px;
  width: ${(props) => props.theme.spacing[4]}px;
`;

const StyledDescriptionText = styled.div`
  align-items: center;
  color: ${(props) => props.theme.color.grey[400]};
  display: flex;
  font-size: 14px;
  font-weight: 700;
  height: 22px;
  justify-content: flex-start;
`;
const StyledMenuItem = withStyles({
  root: {
    backgroundColor: 'white',
    color: '#2c2560',
    '&:hover': {
      backgroundColor: 'grey',
      color: '#2c2560',
    },
    selected: {
      backgroundColor: 'black',
    },
  },
})(MenuItem);

export default ZapModal;
