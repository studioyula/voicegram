---
name: bounce-ball-loop
description: AE 공튀기기 세팅(새 컴프, 흰 공, 포지션/스케일 키프레임, 스쿼시&스트레치, 선택적 loopOut)을 재사용 가능한 형태로 빠르게 구성합니다. 높이/형태를 바꿔 반복 작업할 때 사용합니다.
metadata:
  preferred_location: .cursor/skills
---

# 공튀기기 루프

`user-coloso-ae-mcp`로 After Effects 공튀기기 애니메이션을 재사용 가능하게 구성합니다.

## 사용 시점

- 사용자가 "공튀기기", "바운스볼", "튀는 공 애니메이션"을 요청할 때
- 같은 구조를 유지한 채 높이/크기/스쿼시 형태만 바꿔 재사용하고 싶을 때
- 표현식 없이 키프레임 기반 모션을 만들고, 필요 시 루프를 추가하고 싶을 때

## 작업 절차

1. `user-coloso-ae-mcp`의 `scan`, `execute`로 먼저 스모크 테스트를 실행해 AE 연결 상태를 확인합니다.
2. 요청값에 맞춰 컴포지션을 생성하거나 기존 컴프를 재사용합니다 (`width`, `height`, `fps`, `duration`).
3. 흰색 원형 셰이프 레이어를 만들고, 실제 반지름(원 크기 + 스케일 반영)을 계산합니다.
4. 공이 화면 밖으로 나가지 않도록 포지션 범위를 계산합니다.
   - `topY = radius`
   - `bottomY = comp.height - radius`
   - AE는 `Y`가 클수록 아래이므로, 이 축 기준으로 바운스를 구성합니다.
5. 포지션 키프레임 타이밍/이징을 요청에 맞게 세팅합니다.
   - 하강: 바닥으로 갈수록 가속
   - 상승: 천장으로 갈수록 감속
   - 사용자가 앞 키를 수동 조정했다면, 같은 패턴을 뒤 구간에 복제합니다.
6. 스케일에 스쿼시&스트레치를 키프레임으로 적용합니다.
   - 바닥 접촉: 가로 증가 + 세로 감소(스쿼시)
   - 비행 중간: 가로 감소 + 세로 증가(스트레치)
   - 꼭대기 부근: 필요하면 중립값으로 복귀
7. 자동 반복이 필요하면 루프를 적용합니다.
   - `Position.expression = 'loopOut("cycle")'`
   - `Scale.expression = 'loopOut("cycle")'`
8. 이 스킬은 템플릿이므로 수치를 고정하지 말고, 작업마다 높이/형태/속도 값을 조정 가능하게 유지합니다.
9. `KeyframeEase` 적용 시 영향값(`influence`) 범위를 반드시 지킵니다.
   - AE 허용 범위: `0.1 ~ 100`
   - 에러가 나면 최소치까지만 적용: `0.1`로 클램프
   - 예: 요청값/레퍼런스가 `0.01`이면 실제 적용값은 `0.1`
10. Position 속도 그래프는 `BEZIER` + `Temporal Ease`를 반드시 함께 적용합니다.
   - `setInterpolationTypeAtKey(..., BEZIER, BEZIER)`만으로는 속도 그래프가 원하는 형태로 고정되지 않음
   - `setTemporalEaseAtKey`를 키별로 재적용한 뒤, 다시 읽어서 검증값을 기록할 것

## 파라미터

- `compName` (기본값: `White Ball Comp`): 대상 컴포지션 이름
- `width` (기본값: `1920`): 컴프 가로 해상도
- `height` (기본값: `1080`): 컴프 세로 해상도
- `fps` (기본값: `30`): 프레임레이트
- `duration` (기본값: `5`): 컴프 길이(초)
- `ballDiameter` (기본값: `160`): 공 지름(px)
- `x` (기본값: 컴프 중앙): 공의 가로 위치
- `bounceCycle` (기본값: `0.9s`): 바닥→바닥 1회 왕복 주기
- `squashScale` (기본값: `[118,82]`): 바닥 접촉 스쿼시 값
- `stretchScale` (기본값: `[84,116]`): 비행 중 스트레치 값
- `loopPosition` (기본값: `true`): Position에 `loopOut("cycle")` 적용 여부
- `loopScale` (기본값: `true`): Scale에 `loopOut("cycle")` 적용 여부

## 검증 체크리스트

- AE execute 스모크 테스트가 정상 통과한다.
- 공이 컴프 경계를 벗어나지 않는다(반지름 기준 천장/바닥 정확 반영).
- Position 키프레임이 하강 가속, 상승 감속으로 보인다.
- Scale 키프레임이 바닥 스쿼시, 중간 스트레치로 보인다.
- 루프 사용 시 Position/Scale 모두 점프 없이 자연스럽게 반복된다.
- `KeyframeEase influence` 값이 `0.1` 미만으로 들어가지 않는다(필요 시 `0.1` 적용).
- Position 키 2(가운데)의 `in/out influence`가 의도값(현재 기준 `80/80`)으로 읽혀야 한다.
- 다중 공 작업 시(`Orange Ball 1~10`) 전 레이어 모두 동일 규칙으로 읽기 검증한다.

## Position 속도 그래프 고정 수치 (필수)

아래 값은 `Position` 3키(바닥→꼭대기→바닥) 구조에서 재현 가능한 고정 레시피다.

- 키 시간: `t0=0`, `t1=0.45`, `t2=0.9`
- 키 값 패턴: `[x,bottomY,0] -> [x,topY,0] -> [x,bottomY,0]`
- 보간: 모든 키 `BEZIER`

키별 Temporal Ease 적용값(요청 기준):

1. 키1 (`t=0`, 바닥 출발)
   - inEase: speed `0`, influence `33.333333`
   - outEase: speed `0.0001`, influence `0.1`  (최소치 클램프 반영)
2. 키2 (`t=0.45`, 꼭대기)
   - inEase: speed `0.0000924660325`, influence `80`
   - outEase: speed `0.00035861305162`, influence `80`
3. 키3 (`t=0.9`, 바닥 착지)
   - inEase: speed `0.00036`, influence `0.1`  (최소치 클램프 반영)
   - outEase: speed `0`, influence `33.333333`

적용 순서(반드시 준수):

1. `setValueAtTime`으로 키 생성
2. `setInterpolationTypeAtKey`로 3키 모두 `BEZIER`
3. `setTemporalEaseAtKey`로 위 수치 적용
4. `keyInTemporalEase`/`keyOutTemporalEase` 재조회
5. 재조회 값이 다르면 한 번 더 `setTemporalEaseAtKey` 적용

다중 공(10개) 기준 검증:

- 대상 레이어 패턴: `Orange Ball 1` ~ `Orange Ball 10`
- 각 레이어 `Position.numKeys === 3`
- 각 레이어 키2: `influence in/out === 80`
- 실패 시 레이어명과 실제 측정값을 함께 로그로 남기고 재적용

## 실측 키프레임 레퍼런스 (재측정)

테스트 시점의 실제 키프레임을 기록한 값이다. 다음 구현 시 이 값을 기준 템플릿으로 사용한다.

- 컴프: `ball-bounce-test`
- 레이어: `Yellow Ball`
- 스캔된 속성 수: `2` (`Scale`, `Position`)

### Scale (`ADBE Scale`)

- 차원: `3D 값` (`[x,y,z]`)
- 전체 키 개수: `5` (`selectedKeys=[]`)
- 키 인덱스: `[1,2,3,4,5]`
- 키 간격(초): `[0.13333333333333, 0.31666666666667, 0.41666666666667, 0.03333333333333]`
- 보간: `in/out = 6613` (BEZIER)
- Temporal Ease (공통):
  - `in`: speed `0`, influence `0` (3축 동일)
  - `out`: speed `0`, influence `0` (3축 동일)
- `temporalAutoBezier=false`, `temporalContinuous=false`

키 상세:

1. `t=0`
   - value: `[118,82,100]`
2. `t=0.13333333333333`
   - value: `[84,116,100]`
3. `t=0.45`
   - value: `[100,100,100]`
4. `t=0.86666666666667`
   - value: `[84,116,100]`
5. `t=0.9`
   - value: `[118,82,100]`

### Position (`ADBE Position`)

- 차원: `3D 값` (`[x,y,z]`)
- 선택 키 개수: `3`
- 선택 키 인덱스: `[1,2,3]`
- 선택 키 간격(초): `[0.45, 0.45]`
- 보간: `in/out = 6613` (BEZIER)
- `temporalAutoBezier=false`, `temporalContinuous=false`

선택 키 상세:

1. `t=0`
   - value: `[960,1000,0]`
   - inEase: speed `0`, influence `33.333333`
   - outEase: speed `0.00009247227499`, influence `0.1` (clamped)
2. `t=0.45`
   - value: `[960,500,0]`
   - inEase: speed `0.0000924660325`, influence `80`
   - outEase: speed `0.00035861305162`, influence `80`
3. `t=0.9`
   - value: `[960,1000,0]`
   - inEase: speed `0.0003586130515`, influence `0.1` (clamped)
   - outEase: speed `0`, influence `33.333333`
