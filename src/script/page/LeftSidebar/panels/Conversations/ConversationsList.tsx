/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import React, {MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyBoardEvent, useEffect} from 'react';

import {css} from '@emotion/react';

import {Call} from 'src/script/calling/Call';
import {ConversationLabel, ConversationLabelRepository} from 'src/script/conversation/ConversationLabelRepository';
import {User} from 'src/script/entity/User';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKeyboardEvent} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConnectionRequests} from './ConnectionRequests';
import {ConversationView} from './ConversationView';
import {FilteredGroupConversations} from './FilteredGroupConversations';
import {scrollToConversation} from './helpers';

import {CallState} from '../../../../calling/CallState';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {Conversation} from '../../../../entity/Conversation';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../../../router/routerBindings';
import {SearchRepository} from '../../../../search/SearchRepository';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../state';
import {ContentState} from '../../../useAppState';

interface ConversationsListProps {
  callState: CallState;
  connectRequests: User[];
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  conversationLabelRepository: ConversationLabelRepository;
  currentFocus: string;
  conversationsFilter: string;
  currentFolder?: ConversationLabel;
  resetConversationFocus: () => void;
  handleArrowKeyDown: (index: number) => (e: React.KeyboardEvent) => void;
  clearSearchFilter: () => void;
  isConversationFilterFocused: boolean;
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
}

export const ConversationsList = ({
  conversations,
  conversationsFilter,
  conversationRepository,
  searchRepository,
  listViewModel,
  connectRequests,
  conversationState,
  callState,
  currentFocus,
  currentFolder,
  resetConversationFocus,
  handleArrowKeyDown,
  clearSearchFilter,
  isConversationFilterFocused,
  favoriteConversations,
  archivedConversations,
}: ConversationsListProps) => {
  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {currentTab} = useSidebarStore();

  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);

  const isActiveConversation = (conversation: Conversation) => conversationState.isActiveConversation(conversation);

  const openContextMenu = (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) =>
    listViewModel.onContextMenu(conversation, event);

  const answerCall = (conversation: Conversation) => listViewModel.answerCall(conversation);

  const hasJoinableCall = (conversation: Conversation) => {
    const call = joinableCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversation.qualifiedId, conversation.qualifiedId),
    );

    return !!call && !conversation.isSelfUserRemoved();
  };

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const getCommonConversationCellProps = (conversation: Conversation, index: number) => ({
    isFocused: !isConversationFilterFocused && currentFocus === conversation.id,
    handleArrowKeyDown: handleArrowKeyDown(index),
    resetConversationFocus: resetConversationFocus,
    dataUieName: 'item-conversation',
    conversation: conversation,
    onClick: (event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>) => {
      if (isKeyboardEvent(event)) {
        createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
      } else {
        createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
      }

      clearSearchFilter();
    },
    isSelected: isActiveConversation,
    onJoinCall: answerCall,
    rightClick: openContextMenu,
    showJoinButton: hasJoinableCall(conversation),
  });

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    const element = document.querySelector<HTMLElement>(`[data-uie-uid="${activeConversation.id}"]`);
    if (element) {
      scrollToConversation(element);
    }
  }, [activeConversation?.id]);

  return (
    <>
      <h2 className="visually-hidden">{t('conversationViewTooltip')}</h2>

      <div>
        <ul css={css({margin: 0, paddingLeft: 0})} data-uie-name="conversation-view">
          <ConnectionRequests
            connectionRequests={connectRequests}
            onConnectionRequestClick={onConnectionRequestClick}
          />

          <ConversationView
            conversations={conversations}
            conversationsFilter={conversationsFilter}
            currentFolder={currentFolder}
            getCommonConversationCellProps={getCommonConversationCellProps}
          />
        </ul>
      </div>

      {conversationsFilter && ![SidebarTabs.DIRECTS, SidebarTabs.GROUPS].includes(currentTab) && (
        <FilteredGroupConversations
          archivedConversations={archivedConversations}
          conversationRepository={conversationRepository}
          conversations={conversations}
          conversationsFilter={conversationsFilter}
          currentFolder={currentFolder}
          favoriteConversations={favoriteConversations}
          getCommonConversationCellProps={getCommonConversationCellProps}
          searchRepository={searchRepository}
        />
      )}
    </>
  );
};
