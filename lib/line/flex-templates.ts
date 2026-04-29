/**
 * 生成「獲得點數」的 Flex Message 卡片
 */
export function createPointsAwardFlex(data: {
  studentName: string,
  amount: number,
  reason: string,
  teacherName: string,
  totalBalance?: number
}) {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "點數獎勵通知",
          weight: "bold",
          color: "#ffffff",
          size: "sm"
        }
      ],
      backgroundColor: "#F59E0B", // 琥珀金
      paddingAll: "15px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `+${data.amount}`,
          weight: "bold",
          size: "4xl",
          color: "#F59E0B",
          align: "center",
          margin: "md"
        },
        {
          type: "text",
          text: "點",
          size: "md",
          color: "#F59E0B",
          align: "center",
          weight: "bold"
        },
        {
          type: "separator",
          margin: "lg"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "學生姓名",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2
                },
                {
                  type: "text",
                  text: data.studentName,
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "獎勵原因",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2
                },
                {
                  type: "text",
                  text: data.reason || "表現優異",
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "發放老師",
                  color: "#aaaaaa",
                  size: "xs",
                  flex: 2
                },
                {
                  type: "text",
                  text: data.teacherName,
                  wrap: true,
                  color: "#666666",
                  size: "xs",
                  flex: 5
                }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#F59E0B",
          action: {
            type: "uri",
            label: "查看點數存摺",
            uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/liff/points`
          }
        }
      ]
    },
    styles: {
      footer: {
        separator: true
      }
    }
  }
}
