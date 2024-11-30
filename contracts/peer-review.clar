;; Peer Review System Smart Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-found (err u100))
(define-constant err-unauthorized (err u101))
(define-constant err-already-reviewed (err u102))

;; Data Variables
(define-data-var last-package-id uint u0)
(define-data-var last-review-id uint u0)

;; Define the structure of a software package
(define-map packages
  { package-id: uint }
  {
    developer: principal,
    name: (string-ascii 64),
    version: (string-ascii 32),
    reputation: uint
  }
)

;; Define the structure of a review
(define-map reviews
  { review-id: uint }
  {
    package-id: uint,
    reviewer: principal,
    score: uint,
    comment: (string-ascii 256)
  }
)

;; Define staked amounts for reviewers
(define-map reviewer-stakes
  { reviewer: principal }
  { amount: uint }
)

;; Submit a new package for review
(define-public (submit-package (name (string-ascii 64)) (version (string-ascii 32)))
  (let
    (
      (package-id (+ (var-get last-package-id) u1))
    )
    (map-set packages
      { package-id: package-id }
      {
        developer: tx-sender,
        name: name,
        version: version,
        reputation: u0
      }
    )
    (var-set last-package-id package-id)
    (ok package-id)
  )
)

;; Stake tokens to become a reviewer
(define-public (stake-for-review (amount uint))
  (let
    (
      (current-stake (default-to u0 (get amount (map-get? reviewer-stakes { reviewer: tx-sender }))))
    )
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (ok (map-set reviewer-stakes
      { reviewer: tx-sender }
      { amount: (+ current-stake amount) }))
  )
)

;; Submit a review for a package
(define-public (submit-review (package-id uint) (score uint) (comment (string-ascii 256)))
  (let
    (
      (review-id (+ (var-get last-review-id) u1))
      (package (unwrap! (map-get? packages { package-id: package-id }) err-not-found))
      (reviewer-stake (unwrap! (map-get? reviewer-stakes { reviewer: tx-sender }) err-unauthorized))
    )
    (asserts! (>= (get amount reviewer-stake) u100) err-unauthorized)
    (asserts! (and (>= score u0) (<= score u5)) err-unauthorized)
    (map-set reviews
      { review-id: review-id }
      {
        package-id: package-id,
        reviewer: tx-sender,
        score: score,
        comment: comment
      }
    )
    (var-set last-review-id review-id)
    (ok (update-package-reputation package-id score))
  )
)

;; Update package reputation based on review score
(define-private (update-package-reputation (package-id uint) (score uint))
  (let
    (
      (package (unwrap! (map-get? packages { package-id: package-id }) err-not-found))
      (current-reputation (get reputation package))
      (new-reputation (+ current-reputation score))
    )
    (ok (map-set packages
      { package-id: package-id }
      (merge package { reputation: new-reputation })))
  )
)

;; Get package details
(define-read-only (get-package (package-id uint))
  (map-get? packages { package-id: package-id })
)

;; Get review details
(define-read-only (get-review (review-id uint))
  (map-get? reviews { review-id: review-id })
)

;; Get reviewer stake
(define-read-only (get-reviewer-stake (reviewer principal))
  (map-get? reviewer-stakes { reviewer: reviewer })
)
