# AE Easing Examples

## 1) 기본 이징 80/80 적용 (Position)

- 실행 파일: `scripts/apply-standard-80-80.jsx`

## 2) Overshoot(Back) 적용 순서

1. Position 키프레임을 전부 `LINEAR`로 변경
2. `Overshoot=2`, `Tension=3` 슬라이더 생성
3. Position Expression 적용

- 실행 파일: `scripts/overshoot-back.jsx`

## 3) 스크립트 파일 실행 패턴

1. 필요한 스크립트 파일 내용을 읽는다.
2. `ae_execute`에 `script`로 그대로 전달한다.
3. 반환 JSON에서 `updatedLayers`를 확인한다.
