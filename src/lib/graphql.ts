import { gql } from 'graphql-request';

export const GET_CHATS = gql`
  query GetChats {
    chats(order_by: {updated_at: desc}) {
      id
      title
      model
      updated_at
      created_at
    }
  }
`;

export const GET_CHAT = gql`
  query GetChat($id: uuid!) {
    chats_by_pk(id: $id) {
      id
      title
      model
      updated_at
      messages(order_by: {created_at: asc}) {
        id
        role
        content
        created_at
      }
    }
  }
`;

export const CREATE_CHAT = gql`
  mutation CreateChat($title: String, $model: String!) {
    insert_chats_one(object: {title: $title, model: $model}) {
      id
      title
      model
      updated_at
    }
  }
`;

export const ADD_MESSAGE = gql`
  mutation AddMessage($chatId: uuid!, $role: String!, $content: String!) {
    insert_messages_one(object: {chat_id: $chatId, role: $role, content: $content}) {
      id
      created_at
    }
    update_chats_by_pk(pk_columns: {id: $chatId}, _set: {updated_at: "now()"}) {
      updated_at
    }
  }
`;
