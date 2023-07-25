import React, {useEffect, useState} from 'react';
import {RouteComponentProps} from 'react-router';
import queryString from 'query-string';
import "./index.scss";
import { v4 as uuidv4 } from 'uuid';
import {log} from "util";

type Message = {
    message_id: string,
    author: string,
    message: string,
    is_read: boolean,
}

type PathVariables = {
    id: number
}

const ChatPage = ({ history, location, match }: RouteComponentProps) => {
    const params = queryString.parse(location.search)
    const displayName = params.display_name

    const {id} = match.params as PathVariables

    const [ws, setWs] = useState<WebSocket>();
    const [messages, setMessages] = useState<Array<Message>>([]);
    const [newMsg, setNewMsg] = useState<Message | undefined>(undefined);
    const [newRead, setNewRead] = useState<Message | undefined>(undefined);
    const [currMsg, setCurrMsg] = useState("");

    useEffect(() => {
        setWs(new WebSocket(`ws://localhost:8000/chat?id=${id}&name=${displayName}`))
    }, [])

    useEffect(() => {
        if (ws) {
            ws.onmessage = (evt) => {
                const data = JSON.parse(evt.data);

                // for (let prop in data) {
                //     // alert(prop + ": " + data[prop]);
                //     log(prop + ": " + data[prop]);
                // }
                switch (data.type) {
                    case "user_incoming_message":
                        const msg = data as Message
                        setNewMsg(msg);
                        const messageId = msg.message_id;
                        markMessageAsRead(messageId);
                        break;
                    case "message_read":
                        setNewRead(data as Message);
                        break;
                    default:
                        break;
                }
            };
        }
    }, [ws]);

    useEffect(() => {
        if (newMsg) {
            setMessages(
                messages.concat(newMsg)
            )
        }
    }, [newMsg])

    useEffect(() => {
        if (newRead) {
            const updatedMessages = messages.map((message) => {
                if (message.message_id === newRead.message_id) {
                    return { ...message, isRead: true };
                }
                return message;
            });

            setMessages(updatedMessages);
        }
    }, [newRead, messages]);

    const handleChangeCurrMsg = (msg: string) => {
        setCurrMsg(msg)
    }

    const generateMessageId = (): string => {
        return uuidv4();
    };

    const handleClickSendMsg = () => {
        if (currMsg === "") {
            alert("메세지를 입력하세요")
            return
        }

        const messageId = generateMessageId(); // 고유한 메시지 ID 생성

        const message: Message = {
            message_id: messageId,
            author: displayName?.toString() || "",
            message: currMsg,
            is_read: false,
        };

        ws?.send(JSON.stringify({ type: "user_incoming_message", ...message }));

        setCurrMsg("")
    }

    const handleKeyPress = (key: string) => {
        if (key === "Enter") handleClickSendMsg()
    }

    const markMessageAsRead = (messageId: string) => {
        ws?.send(JSON.stringify({ type: "message_read", messageId: messageId}));
    };

    useEffect(() => {
        // 채팅방에 입장하면 모든 메시지를 읽음 처리합니다.
        messages.forEach((message) => {
            if (!message.is_read) {
                markMessageAsRead(message.message_id);
            }
        });

        // 새로운 메시지가 도착할 때마다 읽음 처리를 수행합니다.
        if (ws != null) {
            ws.onmessage = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.type === "user_incoming_message") {
                    const messageId = data.messageId;
                    markMessageAsRead(messageId);
                }
            };
        }
    }, []);

    return (
        <div className={"chat-page-container"}>
            <div className={"room-name-container"}>
                {id}
            </div>
            <div className={"chat-message-list-container"}>
                <div className={"chat-message-list-inner-container"}>
                    {
                        messages.map((message) => (
                            <div
                                key={message.message_id} // 이전에 추가한 고유 ID를 사용합니다.
                                className={`chat-message-form ${
                                    message.author === displayName ? "me" : "other"
                                }`}
                            >
                                <div className={"chat-message-inner-form"}>
                                    <div className={`chat-display-name`}>{message.author}</div>
                                    <div className={"chat-message"}>{message.message}</div>
                                    <div className={"chat-read"}>
                                        {message.is_read ? "읽음" : "안읽음"}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
            <div className={"chat-input-container"}>
                <input
                    className={"chat-input"}
                    value={currMsg}
                    onChange={(e) => handleChangeCurrMsg(e.target.value)}
                    onKeyPress={e => handleKeyPress(e.key)}
                />
                <button className={"chat-send-button"} onClick={handleClickSendMsg}>send</button>
            </div>
        </div>
    )
}

export default ChatPage;